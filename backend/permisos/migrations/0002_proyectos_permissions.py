"""
Migración de datos: Crear módulo 'proyectos' y permisos granulares para todo el módulo de proyectos.

Permisos granulares por cada acción/página:
- proyectos.view          → Ver listado de proyectos
- proyectos.create        → Crear proyectos
- proyectos.edit          → Editar proyectos
- proyectos.delete        → Eliminar proyectos
- proyectos.view_detail   → Ver detalle de un proyecto
- proyectos.kanban        → Ver vista Kanban
- proyectos.change_estado → Cambiar estado (drag & drop)
- proyectos.timeline      → Ver vista Timeline/Gantt
- proyectos.reports       → Ver reportes comparativos
- proyectos.stats         → Ver estadísticas globales
- proyectos.kpis          → Ver KPIs detallados
- proyectos.asignaciones_view   → Ver asignaciones de equipo
- proyectos.asignaciones_manage → Asignar/desasignar empleados
- proyectos.plantillas    → Ver/usar plantillas
- proyectos.export_excel  → Exportar a Excel
- proyectos.export_pdf    → Exportar a PDF
- proyectos.predicciones  → Ver predicciones IA
- proyectos.logros        → Ver logros/gamificación
- proyectos.active_project → Seleccionar proyecto activo
"""

from django.db import migrations
import uuid


def create_proyectos_perms(apps, schema_editor):
    ModuloSistema = apps.get_model('permisos', 'ModuloSistema')
    Permiso = apps.get_model('permisos', 'Permiso')
    TipoPermiso = apps.get_model('permisos', 'TipoPermiso')

    # 1. Crear módulo 'proyectos' si no existe
    modulo, _ = ModuloSistema.objects.get_or_create(
        codigo='proyectos',
        defaults={
            'nombre': 'Proyectos',
            'descripcion': 'Módulo de gestión de proyectos: CRUD, Kanban, Timeline, Reportes, IA, Gamificación',
            'icono': 'briefcase',
            'color': '#6366f1',
            'orden': 15,
            'activo': True,
        }
    )

    # 2. Obtener TipoPermiso 'rbac_granular'
    tipo_granular, _ = TipoPermiso.objects.get_or_create(
        codigo='rbac_granular',
        defaults={
            'nombre': 'RBAC Granular',
            'categoria': 'crud',
            'activo': True,
        }
    )

    # 3. Definir todos los permisos granulares
    PERMISOS = [
        # CRUD básico
        ('proyectos.view', 'Proyectos - Ver listado', 'Ver el listado de proyectos'),
        ('proyectos.create', 'Proyectos - Crear', 'Crear nuevos proyectos'),
        ('proyectos.edit', 'Proyectos - Editar', 'Editar proyectos existentes'),
        ('proyectos.delete', 'Proyectos - Eliminar', 'Eliminar proyectos'),
        ('proyectos.view_detail', 'Proyectos - Ver detalle', 'Ver el detalle completo de un proyecto'),

        # Vistas especializadas
        ('proyectos.kanban', 'Proyectos - Vista Kanban', 'Acceder a la vista Kanban de proyectos'),
        ('proyectos.change_estado', 'Proyectos - Cambiar estado', 'Cambiar el estado de un proyecto (drag & drop)'),
        ('proyectos.timeline', 'Proyectos - Vista Timeline', 'Acceder a la vista Timeline/Gantt'),
        ('proyectos.reports', 'Proyectos - Reportes', 'Ver reportes comparativos de proyectos'),
        ('proyectos.stats', 'Proyectos - Estadísticas', 'Ver estadísticas globales de proyectos'),
        ('proyectos.kpis', 'Proyectos - KPIs', 'Ver KPIs detallados por proyecto'),

        # Equipo / Asignaciones
        ('proyectos.asignaciones_view', 'Proyectos - Ver equipo', 'Ver las asignaciones de empleados al proyecto'),
        ('proyectos.asignaciones_manage', 'Proyectos - Gestionar equipo', 'Asignar y desasignar empleados a proyectos'),

        # Plantillas
        ('proyectos.plantillas', 'Proyectos - Plantillas', 'Ver y crear proyectos desde plantillas'),

        # Exportación
        ('proyectos.export_excel', 'Proyectos - Exportar Excel', 'Exportar proyectos a formato Excel'),
        ('proyectos.export_pdf', 'Proyectos - Exportar PDF', 'Exportar proyecto individual a PDF'),

        # IA y Gamificación
        ('proyectos.predicciones', 'Proyectos - Predicciones IA', 'Ver análisis predictivo de proyectos'),
        ('proyectos.logros', 'Proyectos - Logros', 'Ver logros y gamificación de proyectos'),

        # Proyecto activo
        ('proyectos.active_project', 'Proyectos - Seleccionar activo', 'Seleccionar el proyecto activo de trabajo'),
    ]

    created_count = 0
    for codigo, nombre, descripcion in PERMISOS:
        _, was_created = Permiso.objects.get_or_create(
            codigo=codigo,
            defaults={
                'nombre': nombre,
                'descripcion': descripcion,
                'modulo': modulo,
                'tipo_permiso': tipo_granular,
                'ambito': 'modulo',
                'activo': True,
                'es_heredable': True,
            }
        )
        if was_created:
            created_count += 1

    print(f'  ✅ Módulo "proyectos" OK. {created_count} permisos creados de {len(PERMISOS)} totales.')


def reverse_perms(apps, schema_editor):
    Permiso = apps.get_model('permisos', 'Permiso')
    Permiso.objects.filter(codigo__startswith='proyectos.').delete()
    ModuloSistema = apps.get_model('permisos', 'ModuloSistema')
    ModuloSistema.objects.filter(codigo='proyectos').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('permisos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_proyectos_perms, reverse_perms),
    ]
