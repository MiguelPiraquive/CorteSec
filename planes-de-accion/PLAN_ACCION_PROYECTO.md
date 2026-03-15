# Plan de acción: selección de proyecto y dashboard contextual

Fecha: 2026-02-03

## Objetivo
Al iniciar sesión, no mostrar el dashboard global. En su lugar, mostrar una pantalla inicial dinámica para **seleccionar proyecto**. Una vez elegido, **todo el dashboard y módulos relacionados** deben filtrar por ese proyecto (nóminas, pagos, ingresos, egresos, KPIs, reportes, etc). Solo lo **global/no relacional** permanece sin filtro.

## Resultado esperado (UX)
1. Login exitoso → pantalla “Selecciona tu proyecto”.
2. Usuario elige proyecto → se guarda “proyecto activo”.
3. Se carga el dashboard **solo del proyecto** y todos los módulos relacionados muestran datos filtrados por el proyecto activo.
4. El usuario puede cambiar proyecto desde un selector visible, en este caso el crud u módulo de proyectos

---

## Alcance funcional
### A. Lo que será “por proyecto”
- Nómina y pagos de nómina asociados al proyecto.
- Pagos a contratistas del proyecto.
- Ingresos y egresos contables asociados al proyecto.
- Reportes financieros y operativos del proyecto.
- KPIs (costos, avance, horas, pagos, ingresos, etc.).

### B. Lo que seguirá siendo global
- Configuración general del sistema.
- Roles, permisos, usuarios.
- Catálogos generales (ej. tipos de pago o catálogos maestros).
### C. Modo multi-proyecto (NUEVO)
- **Vista consolidada:** Opción de ver datos de TODOS los proyectos simultáneamente.
- **Selección múltiple:** Elegir 2, 3 o más proyectos específicos para comparar.
- **Datos separados:** Información claramente identificada por proyecto.
- **Dashboards comparativos:** KPIs agregados y por proyecto.
- **Reportes consolidados:** Sumatorias y comparativas entre proyectos.
---

---

## Análisis de mejoras adicionales

### Mejora del modelo Project
**Situación actual:**
- Project tiene solo: name, description, contractor, start_date, end_date.
- Falta información clave de gestión.

**Campos a agregar:**
1. **Presupuesto y control financiero:**
   - `presupuesto_estimado` (Decimal)
   - `presupuesto_aprobado` (Decimal)
   - `gasto_acumulado` (calculado)
   - `moneda` (CharField con choices: COP, USD, EUR)

2. **Gestión operativa:**
   - `estado` (choices: planificacion, activo, pausado, completado, cancelado)
   - `prioridad` (choices: baja, media, alta, critica)
   - `progreso` (IntegerField 0-100, % completado)
   - `responsable` (FK a CustomUser, líder del proyecto)
   - `cliente` (CharField, empresa/cliente final)
   - `centro_costo` (CharField, departamento/área)

3. **Visual y organización:**
   - `color` (CharField, hex color para UI)
   - `icono` (CharField, slug del icono)
   - `tags` (JSONField, etiquetas flexibles)
   - `codigo_proyecto` (CharField único, ej: PROJ-2026-001)

4. **Fechas extendidas:**
   - `fecha_estimada_fin` (DateField)
   - `fecha_real_fin` (DateField, cuando se completa)

5. **Archivos y notas:**
   - `documentos` (relación M2M con DocumentoProyecto)
   - `notas_internas` (TextField)

**Beneficios:**
- Tracking real de presupuesto vs gastado.
- Estados claros en UI (kanban, timeline).
- Búsqueda y filtros avanzados.
- Reportes más ricos.

---

### Módulo de proyectos en sidebar
**Ubicación:** Mantener en la sección "Operaciones".

**Acción:** 
- Sigue visible en sidebar como "Proyectos".
- Desde ahí se puede:
  - Crear nuevo proyecto.
  - Listar todos los proyectos.
  - Ver detalles, editar, eliminar.

**Diferencia con selección de proyecto activo:**
- El módulo "Proyectos" es para **gestionar** (CRUD).
- La "selección de proyecto activo" es para **filtrar el contexto** del dashboard.
- Pero el modelo "Proyectos" tambien se pueden seleccionar los proyectos desde ahi.

---

### Pantalla inicial sin proyecto
**Escenario:** Usuario nuevo sin proyectos.

**Acciones:**
1. Al verificar `GET /api/active-project/`:
   - Si no existe y tampoco tiene proyectos → redirigir a `/crear-proyecto-inicial`.
2. Crear vista `/crear-proyecto-inicial`:
   - Wizard simple de 3 pasos:
     - Paso 1: Información básica (nombre, descripción, cliente).
     - Paso 2: Presupuesto y fechas.
     - Paso 3: Responsable y prioridad.
   - Al finalizar → crear proyecto y asignarlo como activo.
   - Redirigir a dashboard del proyecto.

**UI recomendada:**
- Ilustración de bienvenida.
- Mensaje: "¡Bienvenido! Empecemos creando tu primer proyecto".
- Formulario amigable con validaciones.

---

### CRUD visual de proyectos
**Meta:** Hacer el módulo de proyectos el más visual y atractivo.

**Vistas propuestas:**

1. **Vista Cards (por defecto):**
   - Grid responsivo de cards.
   - Cada card muestra:
     - Icono y color del proyecto.
     - Nombre y código.
     - Estado (badge con color).
     - Progreso (barra visual).
     - Presupuesto: usado/total con gráfico mini.
     - Responsable (avatar + nombre).
     - Fechas (inicio/fin).
     - Acciones rápidas (editar, ver, eliminar).

2. **Vista Kanban:**
   - Columnas por estado (planificación, activo, pausado, completado).
   - Drag & drop para cambiar estado.
   - Cards compactas con info clave.

3. **Vista Timeline:**
   - Línea de tiempo horizontal.
   - Proyectos posicionados por fecha inicio/fin.
   - Colores y progreso visual.

4. **Vista Tabla:**
   - Tabla completa con todas las columnas.
   - Ordenamiento y filtros avanzados.
   - Exportar a Excel/PDF.

**Filtros y búsqueda:**
- Por estado, prioridad, responsable, fechas, presupuesto.
- Búsqueda full-text en nombre, descripción, cliente.

**Acciones masivas:**
- Cambiar estado de varios proyectos.
- Asignar responsable.
- Exportar selección.

---

### Ideas adicionales profesionales

1. **Dashboard mini por proyecto (en la card):**
   - KPIs rápidos: gastos, nómina pagada, pagos pendientes.
   - Gráfico de progreso financiero.

2. **Plantillas de proyecto:**
   - Crear proyectos desde plantillas predefinidas.
   - Plantillas con presupuesto y estructura base.

3. **Archivo de proyectos:**
   - Proyectos completados/cancelados → archivados.
   - Vista separada "Proyectos archivados".

4. **Integración con calendario:**
   - Ver proyectos en calendario por fechas.
   - Alertas de hitos y vencimientos.

5. **Reportes por proyecto:**
   - Dashboard específico del proyecto (al hacer clic).
   - Tabs: Resumen, Finanzas, Nómina, Pagos, Documentos, Timeline.

6. **Permisos por proyecto:**
   - Usuarios con acceso limitado a proyectos específicos.
   - Roles por proyecto (líder, colaborador, observador).

7. **Notas y comentarios:**
   - Sistema de comentarios en el proyecto.
   - Historial de cambios y auditoría.

8. **Gamificación:**
   - Proyectos con mayor avance destacados.
   - Alertas de proyectos con presupuesto excedido.

---

## Plan de acción (superdetallado)

### 1) Mejora del modelo Project (NUEVO)
**Meta:** Ampliar Project con campos realistas y útiles.

**Acciones backend:**
1. Editar `backend/dashboard/models.py`:
   - Agregar campos: presupuesto_estimado, presupuesto_aprobado, estado, prioridad, progreso, responsable, cliente, centro_costo, color, codigo_proyecto, fecha_estimada_fin, tags.
   - Agregar choices para estado, prioridad, moneda.
   - Crear método `gasto_acumulado` (suma de pagos + nóminas del proyecto).
   - Crear método `presupuesto_restante`.
   - Agregar validaciones (presupuesto >= 0, progreso 0-100).
2. Crear migración.
3. Actualizar serializer de Project con todos los campos nuevos.
4. Agregar campos a admin.

**Acciones frontend:**
1. Actualizar formularios de creación/edición:
   - Agregar inputs para presupuesto, estado, prioridad, responsable, color.
   - Selector de color visual.
   - Selector de responsable (dropdown de usuarios).
2. Actualizar listados para mostrar nuevos campos.

**Validaciones:**
- Estado inicial: "planificacion" por defecto.
- Código de proyecto autogenerado si no se proporciona.
- Progreso entre 0 y 100.

---

### 2) Modelado de "Proyecto activo" y modo multi-proyecto (ACTUALIZADO)
**Meta:** Establecer cómo se almacena el proyecto seleccionado por usuario, con soporte para modo multi-proyecto.

**Acciones:**
1. Definir el modelo de selección activa:
   - Opción A: en sesión (backend) + almacenamiento en frontend (localStorage).
   - Opción B: en backend como "ProyectoActivo" por usuario.
2. Recomiendo **Opción B** para coherencia multi-tenant y auditoría.
3. Crear tabla `ActiveProject`:
   - `user` (FK a CustomUser)
   - `project` (FK a Project, **nullable** para modo "todos")
   - `mode` (CharField: 'single', 'multiple', 'all')
   - `selected_projects` (JSONField para IDs cuando mode='multiple')
   - `updated_at`
   - Índice único `user`.
4. Crear endpoints:
   - `GET /api/active-project/` → devuelve proyecto activo o modo actual.
     - Respuesta: `{ "mode": "single", "project": {...} }`
     - Respuesta: `{ "mode": "multiple", "projects": [...] }`
     - Respuesta: `{ "mode": "all", "projects": [...] }` (todos los proyectos de la organización)
   - `POST /api/active-project/` → guarda proyecto(s) activo(s) y modo:
     - Payload: `{ "mode": "single", "project_id": 123 }`
     - Payload: `{ "mode": "multiple", "project_ids": [123, 456, 789] }`
     - Payload: `{ "mode": "all" }` (todos los proyectos de la organización)

**Validaciones:**
- El usuario solo puede seleccionar proyectos de su organización.
- En modo 'multiple': validar que todos los IDs existen y son accesibles.
- En modo 'all': no validar proyecto específico, usar todos los de la org.


---

### 3) Flujo de login y redirección (ACTUALIZADO)
**Meta:** Evitar cargar el dashboard global si no hay proyecto activo.

**Acciones:**
1. En frontend, después de login:
   - Llamar `GET /api/active-project/`.
   - **Si existe:** redirigir a `/dashboard`.
   - **Si no existe pero tiene proyectos:** redirigir a `/seleccionar-proyecto`.
   - **Si no existe y NO tiene proyectos:** redirigir a `/crear-proyecto-inicial`.
2. Crear la ruta `/seleccionar-proyecto`.
3. Crear la ruta `/crear-proyecto-inicial` (wizard de bienvenida).
4. Crear la vista de selección con:
   - Buscador de proyectos.
   - Lista filtrable.
   - Cards con resumen mejoradas.

---

### 4) Pantalla "Crear proyecto inicial" (NUEVO)
**Meta:** Onboarding fluido para usuarios nuevos sin proyectos.

**Componentes:**
- Header: "¡Bienvenido! Crea tu primer proyecto".
- Ilustración atractiva (SVG de bienvenida).
- Wizard de 3 pasos con navegación visual:
  - **Paso 1 - Información básica:**
    - Nombre del proyecto (requerido).
    - Descripción breve.
    - Cliente/empresa.
  - **Paso 2 - Presupuesto y finanzas:**
    - Presupuesto estimado (opcional).
    - Moneda (COP, USD, EUR).
    - Centro de costo/departamento.
  - **Paso 3 - Gestión:**
    - Responsable (selector de usuarios, por defecto: actual).
    - Prioridad (baja, media, alta).
    - Fechas estimadas (inicio y fin).
- Botón "Crear y comenzar" al final.
- Opción "Saltar" para usuarios avanzados.

**Acción al finalizar:**
- POST `/api/projects/` con los datos ingresados.
- POST `/api/active-project/` automáticamente con el `project_id` creado.
- Guardar en localStorage el proyecto activo.
- Redirigir a `/dashboard` (ya filtrado por el nuevo proyecto).

**Validaciones:**
- Solo nombre es obligatorio en paso 1.
- Presupuesto opcional pero si se ingresa debe ser > 0.
- Responsable por defecto: usuario actual.
- Si se salta, crear proyecto con valores mínimos y continuar.

---

### 5) Pantalla de selección de proyecto con modo multi-proyecto (ACTUALIZADO)
**Meta:** UI atractiva y útil para elegir entre proyectos existentes, con soporte para selección múltiple o todos.

**Componentes clave:**
- **Header:** "Selecciona un proyecto" + botón destacado "Crear nuevo proyecto".
- **Selector de modo (NUEVO):**
  - Toggle o tabs arriba:
    - "Proyecto único" (por defecto).
    - "Múltiples proyectos".
    - "Todos los proyectos".
  - Tooltip explicativo en cada opción.
- Buscador + filtros avanzados (dropdowns):
  - Por estado (todos, planificación, activo, pausado, completado).
  - Por responsable (dropdown de usuarios).
  - Por rango de fechas (date picker).
  - Por rango de presupuesto.
- **Vista cards mejorada:**
  - Grid responsivo (3-4 columnas en desktop, 1 en móvil).
  - **Modo "Proyecto único":**
    - Cada card con diseño visual:
      - **Header:** 
        - Icono y color del proyecto (borde superior con color).
        - Código del proyecto (pequeño, arriba a la derecha).
      - **Cuerpo:**
        - Nombre del proyecto (título grande).
        - Estado (badge con color semántico).
        - Barra de progreso visual (con porcentaje).
        - Mini gráfico circular: presupuesto usado vs total.
        - Responsable (avatar + nombre).
        - Fechas: "15 Ene 2026 - 30 Jun 2026".
      - **Footer:**
        - Botón "Seleccionar proyecto" (primario).
        - Ícono de info para ver detalles rápidos (tooltip).
  - **Modo "Múltiples proyectos":**
    - Cada card incluye checkbox en la esquina superior izquierda.
    - Botón flotante inferior: "Continuar con X proyectos seleccionados" (solo visible si hay selección).
    - Máximo recomendado: 5-10 proyectos para evitar sobrecarga.
  - **Modo "Todos los proyectos":**
    - Mostrar card especial grande con icono de múltiples proyectos.
    - Resumen: "Ver datos consolidados de {count} proyectos".
    - Botón "Continuar con todos los proyectos".
- Paginación con "Load more" o scroll infinito.
- Animaciones suaves al hover.

**Acción al elegir:**
- **Modo único:** 
  - POST `/api/active-project/` con `{ "mode": "single", "project_id": 123 }`.
  - Guardar en localStorage.
  - Notificación: "Proyecto '{nombre}' seleccionado".
  - Redirigir a `/dashboard`.
- **Modo múltiple:**
  - POST `/api/active-project/` con `{ "mode": "multiple", "project_ids": [123, 456, 789] }`.
  - Guardar en localStorage.
  - Notificación: "Viendo datos de 3 proyectos seleccionados".
  - Redirigir a `/dashboard` (modo consolidado).
- **Modo todos:**
  - POST `/api/active-project/` con `{ "mode": "all" }`.
  - Guardar en localStorage.
  - Notificación: "Viendo datos de todos los proyectos ({count})".
  - Redirigir a `/dashboard` (modo consolidado).

**Botón "Crear nuevo proyecto":**
- Abre modal con formulario rápido o redirige a `/dashboard/projects/new`.
- Al crear, automáticamente se asigna como activo y redirige al dashboard.

---

### 6) CRUD visual de proyectos en módulo "Proyectos" (NUEVO COMPLETO)
**Meta:** Hacer del módulo de proyectos el más visual, funcional y profesional del sistema.

**Ubicación:** Sidebar → Operaciones → Proyectos (`/dashboard/projects`).

**Acciones backend:**
1. **Actualizar endpoints existentes:**
   - `GET /api/projects/` → lista con filtros avanzados (estado, prioridad, responsable, fechas, presupuesto).
   - `POST /api/projects/` → crear proyecto (validaciones completas).
   - `GET /api/projects/:id/` → detalle completo con KPIs calculados.
   - `PUT /api/projects/:id/` → editar proyecto.
   - `PATCH /api/projects/:id/` → actualización parcial (ej: solo progreso).
   - `DELETE /api/projects/:id/` → eliminar o archivar proyecto.

2. **Nuevos endpoints específicos:**
   - `GET /api/projects/stats/` → KPIs globales:
     - Total proyectos.
     - Proyectos activos/pausados/completados.
     - Presupuesto total agregado.
     - Gasto total agregado.
     - Promedio de progreso.
   - `PATCH /api/projects/:id/estado/` → cambiar solo el estado (para kanban).
   - `GET /api/projects/kanban/` → datos agrupados por estado con conteos.
   - `POST /api/projects/bulk-update/` → actualización masiva de estado o responsable.
   - `POST /api/projects/:id/duplicate/` → duplicar proyecto como plantilla.
   - `GET /api/projects/:id/kpis/` → KPIs detallados del proyecto:
     - Gasto acumulado (nóminas + pagos).
     - Presupuesto restante.
     - Porcentaje de ejecución financiera.
     - Número de colaboradores asignados.
     - Pagos realizados vs pendientes.

**Acciones frontend:**
1. **Crear página principal `/dashboard/projects`:**
   - **Barra superior:**
     - KPIs globales (cards horizontales):
       - Total proyectos | Activos | Presupuesto total | Gasto total.
     - Botón destacado "Nuevo proyecto" (esquina derecha).
   - **Tabs de navegación para cambiar vista:**
     - 🃏 Cards (vista por defecto).
     - 📊 Kanban.
     - 📅 Timeline.
     - 📋 Tabla.
   - **Barra de herramientas:**
     - Buscador (búsqueda full-text).
     - Filtros (dropdowns):
       - Estado (multi-select).
       - Prioridad (multi-select).
       - Responsable (select con avatares).
       - Rango de fechas.
     - Botones de acción:
       - Exportar (Excel/PDF) → exporta proyectos filtrados.
       - Refrescar datos.

2. **Vista Cards (por defecto):**
   - Grid responsivo de 3-4 columnas (Tailwind Grid).
   - Cada card con diseño profesional:
     - **Header visual:**
       - Borde superior con color del proyecto (`color` field).
       - Icono del proyecto (lucide-react).
       - Código pequeño (esquina superior derecha).
     - **Contenido principal:**
       - Título del proyecto (grande, bold).
       - Badge de estado con colores semánticos:
         - Planificación: azul.
         - Activo: verde.
         - Pausado: amarillo.
         - Completado: gris.
         - Cancelado: rojo.
       - Badge de prioridad (esquina, pequeño).
       - Descripción breve (truncada, 2 líneas).
     - **Mini dashboard interno:**
       - Barra de progreso animada (0-100%).
       - Mini gráfico circular (Chart.js o Recharts):
         - Presupuesto usado vs restante.
         - Colores: verde si ok, amarillo si >80%, rojo si excedido.
       - Datos clave en texto pequeño:
         - "Nómina: $X pagada".
         - "Pagos: Y realizados".
     - **Footer:**
       - Avatar + nombre del responsable.
       - Fechas: "15 Ene - 30 Jun 2026".
       - Iconos de acciones rápidas (hover):
         - Ver detalle (ojo).
         - Editar (lápiz).
         - Establecer como activo (estrella).
         - Eliminar (papelera).
   - **Animaciones:**
     - Hover: elevación (shadow) y escala sutil.
     - Loading: skeleton de cards.

3. **Vista Kanban:**
   - Librería: `react-beautiful-dnd` o `dnd-kit`.
   - **Columnas:**
     - Planificación | Activo | Pausado | Completado | Cancelado.
   - **Cards compactas:**
     - Icono + nombre.
     - Badge de prioridad.
     - Responsable (avatar).
     - Presupuesto (texto pequeño).
   - **Drag & drop:**
     - Arrastrar proyecto entre columnas.
     - Al soltar: `PATCH /api/projects/:id/estado/` automático.
     - Animación suave de cambio de estado.
   - **Contador en header de columna:** "Activo (12)".

4. **Vista Timeline:**
   - Librería: `react-gantt-timeline` o `vis-timeline`.
   - **Eje horizontal:** Tiempo (meses).
   - **Proyectos como barras:**
     - Barra horizontal desde `start_date` hasta `end_date` (o estimada).
     - Color según estado.
     - Altura = prioridad (alta más gruesa).
   - **Hover:** Tooltip con info del proyecto.
   - **Controles:** Zoom in/out, scroll horizontal.

5. **Vista Tabla:**
   - Librería: `react-table` o nativa con sorting.
   - **Columnas:**
     - Checkbox (selección múltiple).
     - Código.
     - Nombre (con icono).
     - Estado (badge).
     - Prioridad (badge).
     - Responsable (avatar + nombre).
     - Presupuesto (formatted).
     - Gasto (formatted).
     - Progreso (barra mini).
     - Fechas (inicio / fin).
     - Acciones (dropdown menú).
   - **Funcionalidades:**
     - Sortable en todas las columnas.
     - Filtros por columna.
     - Selección múltiple para acciones masivas:
       - Cambiar estado.
       - Asignar responsable.
       - Eliminar.
     - Paginación (10, 25, 50, 100 por página).
     - Exportar a Excel/PDF (filtros aplicados).

6. **Modal/Página de detalle del proyecto:**
   - Al hacer clic en "Ver detalle" (ojo):
   - **Tabs internos:**
     - 📊 Resumen (KPIs del proyecto).
     - 💰 Finanzas (presupuesto, gastos, gráficos).
     - 👥 Nómina (colaboradores, pagos de nómina).
     - 💳 Pagos (pagos a contratistas, facturas).
     - 📄 Documentos (archivos adjuntos).
     - 📈 Timeline (historial de cambios).
   - **Resumen tab:**
     - Info básica editable inline.
     - KPIs visuales (cards con gráficos).
     - Botón "Establecer como proyecto activo".

**Acciones disponibles en cada proyecto:**
- Ver detalle (modal o página dedicada).
- Editar (modal o formulario).
- Cambiar estado (dropdown rápido).
- Duplicar (crea copia como plantilla).
- Archivar/Eliminar (confirmación).
- Establecer como proyecto activo (estrella, destacado).
- Exportar datos del proyecto (PDF/Excel).

**Diseño general:**
- Paleta de colores consistente.
- Animaciones suaves (framer-motion).
- Iconos de lucide-react.
- Skeletons durante carga.
- Estados vacíos con ilustraciones ("No hay proyectos. Crea uno nuevo").

---

### 7) Dashboard contextual por proyecto (ACTUALIZADO)
**Meta:** Todo el dashboard principal debe filtrar datos por el proyecto activo seleccionado.

**Acciones backend:**
1. Revisar todos los endpoints del dashboard y forzar filtro:
   - `project_id` obligatorio o inferido del proyecto activo del usuario.
2. Implementar mixin o helper `ActiveProjectMixin`:
   - Método `get_active_project(request)` que:
     - Busca en tabla `ActiveProject` el proyecto del usuario.
     - Si no existe: devuelve error `409 Conflict` con mensaje: "Debe seleccionar un proyecto primero".
     - Si existe: devuelve el `project` y filtra automáticamente los querysets.
3. Aplicar el filtro en módulos relacionados:
   - **Nómina:** Solo mostrar nóminas del proyecto activo.
   - **Pagos:** Solo pagos asociados al proyecto.
   - **Ingresos/Egresos contables:** Filtrados por proyecto.
   - **Reportes financieros:** Contextualizados al proyecto.
   - **KPIs del dashboard:** Todos calculados sobre el proyecto activo.
4. Módulos que siguen siendo globales (sin filtro):
   - Configuración general.
   - Usuarios y roles.
   - Permisos.
   - Catálogos maestros.

**Acciones frontend:**
1. Crear hook personalizado `useActiveProject()`:
   - Llama `GET /api/active-project/` al montar.
   - Guarda resultado en contexto global (React Context).
   - Retorna: `{ activeProject, loading, error, setActiveProject }`.
2. Inyectar `project_id` automáticamente en todas las llamadas relacionadas:
   - Usar interceptor de Axios o wrapper de servicios.
3. En cada vista de módulos relacionados:
   - Usar el hook `useActiveProject()`.
   - Si no hay proyecto activo → redirigir a `/seleccionar-proyecto`.
   - Mostrar en UI el nombre del proyecto activo (header, breadcrumb).

**Indicador visual del proyecto activo:**
- En el layout principal (header o sidebar):
  - Badge o dropdown con el nombre del proyecto activo.
  - Ej: "Proyecto: Sistema ERP 2026 | 🔄 Cambiar".
- Al hacer clic: abre selector rápido de proyectos.

---

### 8) Selector global de proyecto (ACTUALIZADO)
- Botón "Crear y empezar".

**Acción al finalizar:**
- POST `/api/projects/` con los datos.
- POST `/api/active-project/` con el `project_id` creado.
- Guardar en localStorage.
- Redirigir a `/dashboard` (ya filtrado por el proyecto).

**Validaciones:**
- Solo nombre es obligatorio en paso 1.
- Presupuesto opcional pero si se ingresa debe ser > 0.
- Responsable por defecto: usuario actual.

---

### 5) Pantalla de selección de proyecto (ACTUALIZADO)
**Meta:** UI atractiva y útil.

**Componentes clave:**
- Header: “Selecciona un proyecto”.
- Buscador + filtros (estado, fecha, responsable).
- Cards con:
  - Nombre
  - Estado
  - Fecha inicio/fin
  - Presupuesto (si existe)
  - Responsable
- Botón “Entrar al proyecto”.

**Acción al elegir:**
- POST `/api/active-project/` con `project_id`.
- Guardar en localStorage para acceso rápido.
- Redirigir a dashboard del proyecto.

---

### 7) Dashboard contextual por proyecto y modo consolidado (ACTUALIZADO)
**Meta:** Dashboard adaptable según el modo seleccionado (proyecto único, múltiples o todos).

**Acciones backend:**
1. Revisar todos los endpoints del dashboard y adaptar filtro según modo:
   - **Modo 'single':** Filtrar por `project_id` único.
   - **Modo 'multiple':** Filtrar por lista de `project_ids`.
   - **Modo 'all':** Filtrar por todos los proyectos de la organización.
2. Implementar mixin o helper `ActiveProjectMixin`:
   - Método `get_active_project_context(request)` que:
     - Busca en tabla `ActiveProject` el modo y proyecto(s) del usuario.
     - Si no existe: devuelve error `409 Conflict` con mensaje: "Debe seleccionar un proyecto primero".
     - Si existe: devuelve el `mode` y proyecto(s) correspondientes.
   - Método `filter_by_active_projects(queryset, request)` que:
     - Aplica filtro según el modo.
     - En modo 'single': `queryset.filter(project_id=project_id)`.
     - En modo 'multiple': `queryset.filter(project_id__in=project_ids)`.
     - En modo 'all': `queryset.filter(project__organization=org)`.
3. Aplicar el filtro en módulos relacionados:
   - **Nómina:** Solo mostrar nóminas del proyecto/proyectos activos.
   - **Pagos:** Solo pagos asociados a proyecto(s).
   - **Ingresos/Egresos contables:** Filtrados por proyecto(s).
   - **Reportes financieros:** Contextualizados al proyecto(s).
   - **KPIs del dashboard:** Calculados sobre proyecto(s) activos.
4. Módulos que siguen siendo globales (sin filtro):
   - Configuración general.
   - Usuarios y roles.
   - Permisos.
   - Catálogos maestros.

**Acciones frontend:**
1. Crear hook personalizado `useActiveProject()`:
   - Llama `GET /api/active-project/` al montar.
   - Guarda resultado en contexto global (React Context).
   - Retorna: `{ mode, activeProject, activeProjects, loading, error, setActiveProject }`.
2. Inyectar `project_id` o `project_ids` automáticamente según modo:
   - Usar interceptor de Axios o wrapper de servicios.
   - En modo 'single': enviar `project_id`.
   - En modo 'multiple' o 'all': enviar `project_ids` o ningún filtro (backend infiere).
3. En cada vista de módulos relacionados:
   - Usar el hook `useActiveProject()`.
   - Si no hay proyecto activo → redirigir a `/seleccionar-proyecto`.
   - Mostrar en UI el contexto actual:
     - Modo único: "Proyecto: {nombre}".
     - Modo múltiple: "Proyectos: {nombre1}, {nombre2}, {nombre3}...".
     - Modo todos: "Todos los proyectos ({count})".

**Dashboard en modo consolidado (múltiples/todos):**
1. **KPIs agregados:**
   - Sumatoria total de todos los proyectos:
     - Presupuesto total.
     - Gasto total.
     - Nómina pagada total.
     - Pagos realizados totales.
   - Gráfico de barras comparativo por proyecto (top 5-10).
2. **Secciones separadas por proyecto:**
   - Acordeón o tabs con cada proyecto:
     - Cada sección muestra:
       - Nombre del proyecto (header con color).
       - KPIs individuales del proyecto.
       - Mini gráficos.
     - Opción de expandir/colapsar.
   - Vista de tabla comparativa:
     - Filas = proyectos.
     - Columnas = métricas (presupuesto, gasto, progreso, nómina, pagos).
3. **Gráficos comparativos:**
   - Gráfico de barras horizontales: Presupuesto vs Gasto por proyecto.
   - Gráfico circular: Distribución de gastos entre proyectos.
   - Timeline: Proyectos en línea de tiempo (inicio/fin).

**Indicador visual del contexto activo:**
- En el layout principal (header o sidebar):
  - **Modo único:**
    - Badge o dropdown con el nombre del proyecto.
    - Ej: "Proyecto: Sistema ERP 2026 | 🔄 Cambiar".
  - **Modo múltiple:**
    - Badge: "Proyectos seleccionados (3) | 🔄 Cambiar".
    - Tooltip al hover: lista de nombres.
  - **Modo todos:**
    - Badge: "Todos los proyectos (12) | 🔄 Cambiar".
- Al hacer clic: abre selector rápido de proyectos con opción de cambiar modo.

---

### 8) Selector global de proyecto con modo multi-proyecto (ACTUALIZADO)
**Meta:** Permitir cambiar el proyecto activo o el modo de visualización desde cualquier pantalla.

**Ubicación:** Layout principal (DashboardLayout), en el header junto a notificaciones.

**Acciones frontend:**
1. Añadir componente `ProjectSelector` en el layout:
   - **Ubicación visual:** Header, al lado del buscador global.
   - **Diseño según modo actual:**
     - **Modo único:**
       - Muestra: Icono + nombre del proyecto + badge de estado.
       - Flecha hacia abajo (indica desplegable).
     - **Modo múltiple:**
       - Muestra: Icono + "Proyectos (3)" + badge.
       - Tooltip al hover: lista de nombres.
     - **Modo todos:**
       - Muestra: Icono + "Todos ({count})" + badge.
   - **Al desplegar:**
     - **Tabs superiores en el dropdown:**
       - "Proyecto único".
       - "Múltiples".
       - "Todos".
     - **Contenido según tab:**
       - **Tab "Proyecto único":**
         - Buscador interno (filtro rápido).
         - Lista de proyectos recientes (últimos 5).
         - Separador.
         - Botón "Ver todos los proyectos" → redirige a `/dashboard/projects`.
         - Botón "Crear nuevo proyecto".
       - **Tab "Múltiples":**
         - Buscador.
         - Lista de proyectos con checkboxes.
         - Contador: "X proyectos seleccionados".
         - Botón "Aplicar selección".
       - **Tab "Todos":**
         - Card grande con icono.
         - Texto: "Ver datos consolidados de todos tus proyectos ({count})".
         - Botón "Activar modo todos".

2. **Lógica al cambiar de proyecto o modo:**
   - **Modo único:**
     - POST `/api/active-project/` con `{ "mode": "single", "project_id": 123 }`.
     - Actualizar contexto global (`useActiveProject`).
     - Guardar en localStorage.
     - Notificación: "Cambiado a proyecto '{nombre}'".
     - Recargar datos (invalidar caches).
   - **Modo múltiple:**
     - POST `/api/active-project/` con `{ "mode": "multiple", "project_ids": [123, 456] }`.
     - Actualizar contexto.
     - Notificación: "Viendo datos de X proyectos".
     - Recargar dashboard en modo consolidado.
   - **Modo todos:**
     - POST `/api/active-project/` con `{ "mode": "all" }`.
     - Actualizar contexto.
     - Notificación: "Viendo todos los proyectos ({count})".
     - Recargar dashboard en modo consolidado.

**Acciones backend:**
- Endpoints ya definidos: `POST /api/active-project/` con validaciones.

---

### 6) Seguridad y multi-tenant
**Meta:** Respetar tenant/organización.

**Acciones:**
1. En backend:
   - Validar que `project.organization == request.user.organization`.
2. Evitar que el usuario cambie a proyectos de otra organización.
3. Asegurar que los endpoints existentes también respetan tenant.

---

### 7) Migraciones y datos
**Meta:** Ajustar datos existentes.

**Acciones:**
1. Crear migración de `ActiveProject`.
2. Crear script de backfill opcional:
   - Para usuarios con un único proyecto → asignarlo por defecto.
3. Añadir manejo de caso sin proyectos.

---

---

### 9) Seguridad y multi-tenant (ACTUALIZADO)
**Meta:** Respetar tenant/organización y permisos por proyecto.

**Acciones backend:**
1. En todos los endpoints de proyectos:
   - Validar que `project.organization == request.user.organization`.
   - Evitar que usuarios accedan a proyectos de otra organización.
2. En el endpoint `POST /api/active-project/`:
   - Validar que el `project_id` pertenece a la organización del usuario.
   - Si no: devolver error `403 Forbidden`.
3. Asegurar que los endpoints existentes respetan tenant (middleware ya existente).
4. **Opcional - Permisos por proyecto:**
   - Si se requiere, agregar tabla `ProjectMember`:
     - `project`, `user`, `role` (líder, colaborador, observador).
   - Filtrar proyectos disponibles según membresía.

**Auditoría:**
- Registrar en logs:
  - Cambios de proyecto activo.
  - Creación/edición/eliminación de proyectos.
  - Accesos denegados.

---

### 10) Migraciones y datos (ACTUALIZADO)
**Meta:** Ajustar datos existentes y preparar BD.

**Acciones:**
1. Crear migración para modelo `ActiveProject`:
   - Campos: `user`, `project`, `updated_at`.
   - Constraint único en `user`.
2. Crear migración para campos nuevos de `Project`:
   - Todos los campos agregados (presupuesto, estado, prioridad, etc.).
3. Crear script de backfill opcional (`populate_active_projects.py`):
   - Para cada usuario:
     - Si tiene un único proyecto → asignarlo como activo.
     - Si tiene múltiples → dejar sin asignar (forzar selección).
     - Si no tiene proyectos → no hacer nada.
4. Añadir manejo en código:
   - Vista de "No tienes proyectos. Crea uno nuevo" si el usuario no tiene ninguno.

---

### 11) Endpoints a actualizar con soporte multi-proyecto (COMPLETO)
**Módulos que deben filtrar según el modo (único/múltiple/todos):**

**Dashboard / KPIs:**
- `/api/dashboard/stats/` → KPIs según modo:
  - Modo único: KPIs del proyecto.
  - Modo múltiple/todos: KPIs agregados + desglose por proyecto.
- `/api/dashboard/recent-activity/` → actividad filtrada por modo.
- **NUEVO:** `/api/dashboard/consolidated/` → dashboard consolidado para múltiples/todos.

**Nómina / Pagos de nómina:**
- `/api/payroll/` → nóminas filtradas por modo.
- `/api/payroll/stats/` → estadísticas agregadas o por proyecto.
- `/api/payroll/:id/pagos/` → pagos de nómina del proyecto.
- `/api/nomina/` → igual que payroll.

**Pagos a contratistas:**
- `/api/payments/` → pagos filtrados por modo.
- `/api/payments/stats/` → estadísticas agregadas o por proyecto.
- **NUEVO:** `/api/payments/by-project/` → pagos agrupados por proyecto (para modo consolidado).

**Contratistas:**
- `/api/contractors/` → contratistas asignados al(os) proyecto(s) o globales.

**Contabilidad:**
- `/api/contabilidad/ingresos/` → ingresos filtrados por modo.
- `/api/contabilidad/egresos/` → egresos filtrados por modo.
- `/api/contabilidad/reportes/` → reportes según modo.
- **NUEVO:** `/api/contabilidad/comparativa-proyectos/` → comparativa entre proyectos.

**Reportes:**
- `/api/reportes/financieros/` → reportes según modo.
- `/api/reportes/operacionales/` → reportes según modo.
- **NUEVO:** `/api/reportes/consolidado/` → reporte consolidado de múltiples proyectos.

**Proyectos (propios):**
- `/api/projects/comparison/` → comparativa entre proyectos seleccionados.
- `/api/projects/aggregate-stats/` → estadísticas agregadas de múltiples proyectos.

**Módulos globales (sin filtro por proyecto):**
- Usuarios (`/api/usuarios/`).
- Roles (`/api/roles/`).
- Permisos (`/api/permisos/`).
- Configuración (`/api/configuracion/`).
- Organizaciones (`/api/organizaciones/`).

**Estrategia de implementación:**
- Agregar parámetro opcional `project_id` o `project_ids` a endpoints.
- Si no se envía: backend obtiene modo y proyecto(s) activos del usuario automáticamente.
- Backend adapta el queryset según el modo:
  - `mode='single'`: `.filter(project=project)`.
  - `mode='multiple'`: `.filter(project__in=projects)`.
  - `mode='all'`: `.filter(project__organization=org)`.
- Si no hay selección activa: devolver `409`.

---

### 12) Estrategia de compatibilidad (ACTUALIZADO)
**Meta:** Evitar romper flujos actuales durante la transición.

**Acciones:**
1. **Fase 1 - Opcional:**
   - Agregar parámetro opcional `project_id` a endpoints.
   - Si no se envía: usar lógica actual (sin filtro o filtro por organización).
   - Log de advertencia: "Endpoint sin project_id. Usar proyecto activo en futuro".
2. **Fase 2 - Transición:**
   - Frontend comienza a enviar `project_id` o usa proyecto activo.
   - Backend acepta ambos modos.
3. **Fase 3 - Obligatorio:**
   - Hacer `project_id` obligatorio (o inferido de proyecto activo).
   - Si no hay proyecto activo: `409 Conflict`.
4. **Logs de auditoría:**
   - Registrar todas las operaciones con `project_id` asociado.

---

### 13) Pruebas (COMPLETAS)
**Backend:**
- Usuario sin proyecto activo intenta acceder a dashboard → 409.
- Usuario con proyecto activo accede correctamente → datos filtrados.
- Usuario cambia de proyecto → datos actualizados.
- Usuario intenta acceder a proyecto de otra organización → 403.
- Endpoints globales funcionan sin proyecto activo.

**Frontend:**
- Login redirige a:
  - Dashboard si hay proyecto activo.
  - Selección si hay proyectos pero no activo.
  - Crear proyecto si no hay proyectos.
- Selección de proyecto guarda correctamente y redirige.
- Selector global cambia proyecto y recarga datos.
- Hook `useActiveProject()` funciona en todas las vistas.
- Filtros y búsquedas en módulo de proyectos funcionan.
- Vistas (cards, kanban, timeline, tabla) se renderizan correctamente.
- Drag & drop en kanban actualiza estado.
- Exportación de proyectos genera archivos correctos.

---

## Entregables finales
### Backend:
1. Modelo `ActiveProject` con migración (soporte para modo multi-proyecto).
2. Modelo `Project` mejorado con campos nuevos y migración.
3. Endpoints:
   - `GET /api/active-project/` (devuelve modo y proyecto(s))
   - `POST /api/active-project/` (guarda modo: single/multiple/all)
   - `GET /api/projects/` (con filtros avanzados)
   - `POST /api/projects/`
   - `GET /api/projects/:id/`
   - `PUT /api/projects/:id/`
   - `DELETE /api/projects/:id/`
   - `GET /api/projects/stats/`
   - `GET /api/projects/kanban/`
   - `PATCH /api/projects/:id/estado/`
   - `GET /api/projects/:id/kpis/`
   - `POST /api/projects/bulk-update/`
   - **NUEVO:** `GET /api/projects/comparison/` (comparativa entre proyectos)
   - **NUEVO:** `GET /api/projects/aggregate-stats/` (stats agregadas)
   - **NUEVO:** `GET /api/dashboard/consolidated/` (dashboard consolidado)
4. Mixin `ActiveProjectMixin` para filtrar según modo automáticamente.
5. Filtros aplicados en todos los endpoints relevantes (single/multiple/all).
6. Serializers actualizados.
7. Admin actualizado.

### Frontend:
1. Rutas nuevas:
   - `/seleccionar-proyecto` (con selector de modo: único/múltiple/todos)
   - `/crear-proyecto-inicial`
   - `/dashboard/projects` (mejorado)
2. Componentes:
   - `SelectProjectPage` (pantalla de selección con modo multi-proyecto).
   - `CreateProjectWizard` (wizard de bienvenida).
   - `ProjectsPage` (CRUD completo con 4 vistas: cards, kanban, timeline, tabla).
   - `ProjectSelector` (selector global en layout con tabs de modo).
   - `ProjectCard` (card visual para proyectos).
   - `ProjectKanban` (vista kanban con drag & drop).
   - `ProjectTimeline` (vista timeline/gantt).
   - `ProjectTable` (vista tabla completa).
   - `ProjectDetailModal` (modal de detalle con tabs).
   - **NUEVO:** `ConsolidatedDashboard` (dashboard para modo múltiple/todos).
   - **NUEVO:** `ProjectComparison` (vista comparativa entre proyectos).
3. Hook `useActiveProject()` (soporte para mode, activeProject, activeProjects).
4. Contexto `ActiveProjectContext`.
5. Servicios actualizados en `projectService.js`.
6. Lógica de redirección en login.
7. Integración del selector en `DashboardLayout`.
8. **NUEVO:** Componentes de visualización consolidada:
   - Acordeón/tabs por proyecto.
   - Gráficos comparativos (barras, circular, timeline).
   - Tabla comparativa.

### Documentación:
1. README del módulo de proyectos (incluyendo modo multi-proyecto).
2. Guía de uso para usuarios:
   - Cómo seleccionar proyecto único.
   - Cómo seleccionar múltiples proyectos.
   - Cómo activar modo "todos los proyectos".
   - Cómo interpretar el dashboard consolidado.
3. Documentación técnica (API, modelos, hooks, modo multi-proyecto).

---

## Próximos pasos (autorización para empezar)
Si me autorizas, procedo con la implementación en este orden:

### Paso 1: Backend - Modelos y migraciones
- Crear modelo `ActiveProject`.
- Mejorar modelo `Project` con campos nuevos.
- Generar migraciones.

### Paso 2: Backend - Endpoints base
- Endpoint `GET/POST /api/active-project/`.
- Mejorar endpoints de `/api/projects/` (filtros, stats, kanban, kpis).

### Paso 3: Backend - Filtros contextuales
- Crear mixin `ActiveProjectMixin`.
- Aplicar filtro en endpoints de dashboard, nómina, pagos, contabilidad.

### Paso 4: Frontend - Infraestructura
- Hook `useActiveProject()`.
- Contexto `ActiveProjectContext`.
- Lógica de redirección en login.

### Paso 5: Frontend - Pantallas nuevas
- `/seleccionar-proyecto`
- `/crear-proyecto-inicial`

### Paso 6: Frontend - CRUD visual de proyectos
- Vistas: cards, kanban, timeline, tabla.
- Filtros avanzados.
- Acciones masivas.

### Paso 7: Frontend - Selector global
- Componente `ProjectSelector` en layout.
- Lógica de cambio de proyecto.

### Paso 8: Pruebas y ajustes
- Testing manual.
- Ajustes de UI/UX.
- Validaciones finales.

**¿Empezamos con el Paso 1?** Dame luz verde y arranco con modelos y migraciones.
2. Crear endpoints de proyecto activo.
3. Ajustar frontend (rutas + selección + hook).
4. Inyectar filtros en backend.
5. Pruebas finales.

---

## Resumen ejecutivo

Este plan transforma el sistema de un dashboard global a un **sistema contextual por proyecto con modo multi-proyecto**, donde:

1. **Al iniciar sesión**, el usuario no ve un dashboard genérico, sino que debe **seleccionar el proyecto** (o modo de visualización) en el que va a trabajar.

2. **Si no tiene proyectos**, se le presenta un **wizard de bienvenida** para crear su primer proyecto de forma guiada.

3. **Tres modos de visualización:**
   - **Proyecto único:** Dashboard filtrado por un solo proyecto (comportamiento principal).
   - **Múltiples proyectos:** Seleccionar 2, 3 o más proyectos específicos para ver datos comparativos.
   - **Todos los proyectos:** Vista consolidada de todos los proyectos de la organización.

4. **El módulo de proyectos** en el sidebar se convierte en el **más visual y completo**, con:
   - Vistas múltiples (cards, kanban, timeline, tabla).
   - Campos ricos (presupuesto, estado, progreso, responsable, etc.).
   - Filtros avanzados y búsqueda.
   - Acciones masivas y exportación.

5. **Dashboard adaptable según el modo:**
   - **Modo único:** KPIs y datos del proyecto seleccionado.
   - **Modo múltiple/todos:** 
     - KPIs agregados (sumas totales).
     - Secciones separadas por proyecto (acordeón/tabs).
     - Gráficos comparativos (barras, circular, timeline).
     - Tabla comparativa de métricas.
     - Datos claramente identificados por proyecto.

6. **Selector global** en el layout permite:
   - **Cambiar de proyecto** sin perder contexto.
   - **Cambiar de modo** (único → múltiple → todos).
   - Ver qué proyectos están activos en cada momento.

7. **Solo lo global** (usuarios, roles, configuración) permanece sin filtro.

**Beneficios:**
- UX más intuitiva y enfocada.
- **Flexibilidad:** Ver un proyecto o comparar varios según la necesidad.
- Datos contextualizados (evita confusión con múltiples proyectos).
- **Análisis comparativo:** Identificar qué proyectos están por encima/debajo del presupuesto, más avanzados, etc.
- Gestión de proyectos profesional y visual.
- **Reportes consolidados:** Visión global cuando se necesita.
- Reportes y KPIs más precisos por proyecto o agregados.
- Escalabilidad para empresas con múltiples proyectos simultáneos.

**Casos de uso:**
- **Director/Gerente:** Modo "Todos" para visión global de todos los proyectos.
- **Líder de proyecto:** Modo "Único" para enfoque en su proyecto específico.
- **Analista financiero:** Modo "Múltiples" para comparar 3-4 proyectos clave.

- Reportes y KPIs más precisos por proyecto.
- Escalabilidad para empresas con múltiples proyectos simultáneos.

**Impacto técnico:**
- Backend: Modelo `ActiveProject`, filtros contextuales en endpoints, validaciones multi-tenant.
- Frontend: Nuevas rutas, hook personalizado, componentes visuales avanzados, selector global.

**Tiempo estimado de implementación:** 3-5 días completos (backend + frontend + pruebas).

---

**¿Listo para empezar? Dame la autorización y arranco con Paso 1: Modelos y migraciones.** 🚀
