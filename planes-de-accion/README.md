# Planes de Acción - CorteSec

Esta carpeta contiene los planes de acción detallados para el desarrollo e implementación de funcionalidades del sistema CorteSec.

## Índice de Planes

### 📋 [PLAN_ACCION_PROYECTO.md](./PLAN_ACCION_PROYECTO.md)
**Título:** Selección de proyecto y dashboard contextual

**Objetivo:** Implementar un sistema donde el usuario selecciona un proyecto al iniciar sesión, y todo el dashboard/módulos filtran por ese proyecto. Incluye soporte para modo multi-proyecto (único, múltiples, todos).

**Características principales:**
- Sistema de proyecto activo por usuario
- Pantalla de selección dinámica
- Wizard de creación para nuevos usuarios
- CRUD visual de proyectos (4 vistas: cards, kanban, timeline, tabla)
- Dashboard contextual adaptable
- Modo multi-proyecto (único/múltiples/todos)
- Selector global en layout
- Filtros automáticos en todos los módulos

**Estado:** 📝 Planificación completa - Pendiente de implementación

---

## Estructura de un Plan de Acción

Cada plan de acción debe incluir:

1. **Objetivo:** Descripción clara del resultado esperado
2. **Alcance funcional:** Qué módulos/funcionalidades abarca
3. **Análisis de mejoras:** Evaluación del estado actual vs deseado
4. **Plan detallado:** Pasos específicos numerados con:
   - Meta de cada paso
   - Acciones backend y frontend
   - Validaciones
   - Diseño UI/UX
5. **Endpoints:** Lista de APIs a crear/modificar
6. **Seguridad:** Consideraciones de permisos y multi-tenant
7. **Entregables:** Componentes, modelos, endpoints finales
8. **Próximos pasos:** Orden de implementación

---

## Estado de los Planes

- 📝 **Planificación:** Plan documentado, pendiente de inicio
- 🚧 **En progreso:** Implementación activa
- ✅ **Completado:** Implementado y funcional
- ⏸️ **En pausa:** Temporalmente suspendido
- 🔄 **Revisión:** Requiere actualización o ajustes

---

## Agregar un Nuevo Plan

1. Crear archivo `.md` con nomenclatura: `PLAN_ACCION_[NOMBRE].md`
2. Seguir la estructura estándar
3. Actualizar este README con el nuevo plan
4. Marcar el estado actual

---

## Convenciones

- Usar Markdown para formato consistente
- Incluir diagramas o mockups cuando sea necesario (carpeta `/assets`)
- Mantener planes actualizados con cambios durante implementación
- Documentar decisiones técnicas importantes
- Referenciar issues/PRs relacionados cuando aplique

---

Última actualización: 2026-02-03
