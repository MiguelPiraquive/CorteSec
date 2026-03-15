"""
Script FASE 1: Asignación Urgente de Permisos a Roles

Este script asigna permisos básicos a los roles principales para
habilitar el acceso al sistema.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from roles.models import Rol
from permisos.models import Permiso, ModuloSistema
from django.db.models import Q, Count

print("\n" + "="*80)
print("FASE 1: ASIGNACION URGENTE DE PERMISOS".center(80))
print("="*80 + "\n")

# =============================================================================
# PASO 1: Asignar TODOS los permisos al rol Administrador
# =============================================================================

print("PASO 1: Asignando permisos al rol Administrador...")
print("-" * 80)

try:
    # Buscar rol Administrador (probar varios nombres posibles)
    admin_rol = None
    for nombre in ['Administrador', 'ADMINISTRADOR', 'Admin', 'ADMIN']:
        try:
            admin_rol = Rol.objects.get(nombre__iexact=nombre)
            break
        except Rol.DoesNotExist:
            continue

    if not admin_rol:
        # Buscar por código
        for codigo in ['ADMIN', 'ADMINISTRADOR', 'ADM']:
            try:
                admin_rol = Rol.objects.get(codigo__iexact=codigo)
                break
            except Rol.DoesNotExist:
                continue

    if not admin_rol:
        # Si no existe, tomar el primer rol que tenga usuarios asignados
        admin_rol = Rol.objects.annotate(
            num_usuarios=Count('asignaciones')
        ).filter(num_usuarios__gt=0).first()

    if not admin_rol:
        print("ERROR: No se encontro ningun rol de Administrador")
        print("Roles disponibles:")
        for rol in Rol.objects.all():
            print(f"  - {rol.nombre} (codigo: {rol.codigo})")
        exit(1)

    print(f"OK: Encontrado rol '{admin_rol.nombre}' (ID: {admin_rol.id})")

    # Obtener TODOS los permisos activos
    todos_permisos = Permiso.objects.filter(activo=True)
    total_permisos = todos_permisos.count()

    print(f"OK: Encontrados {total_permisos} permisos activos")

    # Limpiar permisos actuales (por si acaso)
    admin_rol.permisos.clear()

    # Asignar todos los permisos
    admin_rol.permisos.add(*todos_permisos)

    # Verificar
    permisos_asignados = admin_rol.permisos.count()

    print(f"\nOK: EXITO: Asignados {permisos_asignados} permisos al rol '{admin_rol.nombre}'")
    print(f"  - Total de permisos en sistema: {total_permisos}")
    print(f"  - Permisos asignados al rol: {permisos_asignados}")
    print(f"  - Cobertura: 100%")

except Exception as e:
    print(f"\nERROR: ERROR al asignar permisos a Administrador: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n")

# =============================================================================
# PASO 2: Asignar permisos básicos al rol Empleado
# =============================================================================

print("PASO 2: Asignando permisos al rol Empleado...")
print("-" * 80)

try:
    # Buscar rol Empleado
    empleado_rol = None
    for nombre in ['Empleado', 'EMPLEADO', 'Employee']:
        try:
            empleado_rol = Rol.objects.get(nombre__iexact=nombre)
            break
        except Rol.DoesNotExist:
            continue

    if not empleado_rol:
        # Buscar por código
        for codigo in ['EMPLEADO', 'EMP', 'EMPLOYEE']:
            try:
                empleado_rol = Rol.objects.get(codigo__iexact=codigo)
                break
            except Rol.DoesNotExist:
                continue

    if not empleado_rol:
        print("WARN: No se encontro rol de Empleado, se omite este paso")
    else:
        print(f"OK: Encontrado rol '{empleado_rol.nombre}' (ID: {empleado_rol.id})")

        # Limpiar permisos actuales
        empleado_rol.permisos.clear()

        # Asignar permisos de LECTURA (list, view, detail)
        permisos_lectura = Permiso.objects.filter(
            Q(codigo__icontains=':list') |
            Q(codigo__icontains=':view') |
            Q(codigo__icontains=':detail') |
            Q(codigo__icontains=':read'),
            activo=True
        )

        empleado_rol.permisos.add(*permisos_lectura)

        # Agregar permisos del módulo Perfil (para que pueda ver/editar su perfil)
        try:
            modulo_perfil = ModuloSistema.objects.get(codigo__iexact='perfil')
            permisos_perfil = Permiso.objects.filter(modulo=modulo_perfil, activo=True)
            empleado_rol.permisos.add(*permisos_perfil)
        except ModuloSistema.DoesNotExist:
            print("  WARN: Modulo 'perfil' no encontrado")

        # Agregar permisos del módulo Dashboard (para que pueda ver dashboard)
        try:
            modulo_dashboard = ModuloSistema.objects.get(codigo__iexact='dashboard')
            permisos_dashboard = Permiso.objects.filter(
                modulo=modulo_dashboard,
                activo=True
            ).exclude(
                codigo__icontains=':delete'
            ).exclude(
                codigo__icontains=':create'
            )
            empleado_rol.permisos.add(*permisos_dashboard)
        except ModuloSistema.DoesNotExist:
            print("  WARN: Modulo 'dashboard' no encontrado")

        # Verificar
        permisos_empleado = empleado_rol.permisos.count()
        print(f"\nOK: EXITO: Asignados {permisos_empleado} permisos al rol '{empleado_rol.nombre}'")
        print(f"  - Permisos de lectura: {permisos_lectura.count()}")
        print(f"  - Permisos totales asignados: {permisos_empleado}")

except Exception as e:
    print(f"\nERROR: ERROR al asignar permisos a Empleado: {e}")
    import traceback
    traceback.print_exc()

print("\n")

# =============================================================================
# PASO 3: Resumen y Verificación
# =============================================================================

print("PASO 3: Resumen de Asignaciones")
print("-" * 80)

from django.db.models import Count

roles_con_permisos = Rol.objects.annotate(
    num_permisos=Count('permisos')
).filter(num_permisos__gt=0, activo=True)

print(f"\nRoles activos con permisos asignados: {roles_con_permisos.count()}")
print("")

for rol in roles_con_permisos:
    num_usuarios = rol.asignaciones.filter(activa=True).count()
    print(f"  {rol.nombre:30} {rol.permisos.count():4} permisos | {num_usuarios} usuarios")

# Estadísticas generales
total_permisos = Permiso.objects.filter(activo=True).count()
permisos_asignados = Permiso.objects.filter(
    roles_asignados__activo=True
).distinct().count()

print(f"\nEstadisticas generales:")
print(f"  Total de permisos activos: {total_permisos}")
print(f"  Permisos asignados a roles: {permisos_asignados}")
print(f"  Permisos sin asignar: {total_permisos - permisos_asignados}")

print("\n" + "="*80)
print("FASE 1 COMPLETADA".center(80))
print("="*80 + "\n")

print("Proximos pasos:")
print("  1. Ejecutar: python manage.py reporte_permisos_usuario <username>")
print("  2. Ejecutar: python fase2_init_permisos_completo.py")
print("")
