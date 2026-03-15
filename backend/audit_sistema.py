"""
Script de Auditoría de Permisos - Versión Directa
=================================================

Este script audita el sistema de permisos sin usar el sistema de management commands.
Ejecutar desde el directorio backend con: python audit_sistema.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Count, Q
from collections import defaultdict
import json

# Importar modelos después de setup
from roles.models import Rol, AsignacionRol, TipoRol
from permisos.models import Permiso, PermisoDirecto, ModuloSistema

User = get_user_model()


def print_header(text):
    """Imprime un encabezado formateado"""
    print(f"\n{'='*80}")
    print(f"{text:^80}")
    print(f"{'='*80}\n")


def print_section(text):
    """Imprime un título de sección"""
    print(f"\n{text}")
    print("-" * 80)


def auditar_resumen():
    """Audita resumen general del sistema"""
    print_section("1. RESUMEN GENERAL")

    # Contadores
    total_usuarios = User.objects.count()
    usuarios_activos = User.objects.filter(is_active=True).count()
    usuarios_con_roles = User.objects.filter(
        asignaciones_rol__activa=True
    ).distinct().count()
    superusuarios = User.objects.filter(is_superuser=True, is_active=True).count()

    total_roles = Rol.objects.count()
    roles_activos = Rol.objects.filter(activo=True).count()

    total_permisos = Permiso.objects.count()
    permisos_activos = Permiso.objects.filter(activo=True).count()

    total_asignaciones = AsignacionRol.objects.count()
    asignaciones_activas = AsignacionRol.objects.filter(activa=True).count()

    permisos_directos = PermisoDirecto.objects.filter(activo=True).count()

    # Mostrar
    print(f"\n👥 USUARIOS:")
    print(f"   Total: {total_usuarios}")
    print(f"   Activos: {usuarios_activos}")
    print(f"   Con roles: {usuarios_con_roles}")
    print(f"   Sin roles: {usuarios_activos - usuarios_con_roles}")
    print(f"   Superusuarios: {superusuarios}")

    print(f"\n🎭 ROLES:")
    print(f"   Total: {total_roles}")
    print(f"   Activos: {roles_activos}")

    print(f"\n🔐 PERMISOS:")
    print(f"   Total: {total_permisos}")
    print(f"   Activos: {permisos_activos}")
    print(f"   Directos activos: {permisos_directos}")

    print(f"\n📋 ASIGNACIONES:")
    print(f"   Total: {total_asignaciones}")
    print(f"   Activas: {asignaciones_activas}")

    return {
        'usuarios_sin_roles': usuarios_activos - usuarios_con_roles,
        'superusuarios': superusuarios,
    }


def auditar_roles():
    """Audita todos los roles"""
    print_section("2. ROLES DETALLADOS")

    roles = Rol.objects.annotate(
        num_permisos=Count('permisos', filter=Q(permisos__activo=True)),
        num_usuarios=Count('asignaciones', filter=Q(asignaciones__activa=True))
    ).select_related('tipo_rol').order_by('-num_usuarios')

    print(f"\n{'Rol':<35} {'Permisos':<12} {'Usuarios':<12} {'Estado'}")
    print(f"{'-'*35} {'-'*12} {'-'*12} {'-'*10}")

    roles_sin_permisos = []
    roles_sin_usuarios = []

    for rol in roles[:30]:
        nombre = rol.nombre[:33] + '..' if len(rol.nombre) > 35 else rol.nombre
        estado = '✓ Activo' if rol.activo else '✗ Inactivo'

        print(f"{nombre:<35} {rol.num_permisos:<12} {rol.num_usuarios:<12} {estado}")

        if rol.num_permisos == 0 and rol.activo:
            roles_sin_permisos.append(rol.nombre)
        if rol.num_usuarios == 0 and rol.activo and not rol.es_sistema:
            roles_sin_usuarios.append(rol.nombre)

    if len(roles) > 30:
        print(f"\n... y {len(roles) - 30} roles más")

    if roles_sin_permisos:
        print(f"\n⚠️  ROLES ACTIVOS SIN PERMISOS: {len(roles_sin_permisos)}")
        for rol in roles_sin_permisos[:5]:
            print(f"   - {rol}")

    if roles_sin_usuarios:
        print(f"\nℹ️  ROLES ACTIVOS SIN USUARIOS: {len(roles_sin_usuarios)}")
        for rol in roles_sin_usuarios[:5]:
            print(f"   - {rol}")

    return {
        'sin_permisos': len(roles_sin_permisos),
        'sin_usuarios': len(roles_sin_usuarios),
    }


def auditar_permisos():
    """Audita permisos del sistema"""
    print_section("3. PERMISOS POR MÓDULO")

    permisos = Permiso.objects.annotate(
        num_roles=Count('roles_asignados', distinct=True),
        num_directos=Count('asignaciones_directas', filter=Q(asignaciones_directas__activo=True))
    ).select_related('modulo', 'tipo_permiso')

    permisos_por_modulo = defaultdict(lambda: {'total': 0, 'activos': 0, 'asignados': 0})
    permisos_sin_asignar = []

    for permiso in permisos:
        modulo = permiso.modulo.nombre if permiso.modulo else 'Sin módulo'
        permisos_por_modulo[modulo]['total'] += 1

        if permiso.activo:
            permisos_por_modulo[modulo]['activos'] += 1

        if permiso.num_roles > 0 or permiso.num_directos > 0:
            permisos_por_modulo[modulo]['asignados'] += 1
        elif permiso.activo:
            permisos_sin_asignar.append(permiso.codigo)

    print(f"\n{'Módulo':<30} {'Total':<10} {'Activos':<10} {'Asignados':<10}")
    print(f"{'-'*30} {'-'*10} {'-'*10} {'-'*10}")

    for modulo, stats in sorted(permisos_por_modulo.items()):
        mod_nombre = modulo[:28] + '..' if len(modulo) > 30 else modulo
        print(f"{mod_nombre:<30} {stats['total']:<10} {stats['activos']:<10} {stats['asignados']:<10}")

    if permisos_sin_asignar:
        print(f"\nℹ️  PERMISOS ACTIVOS SIN ASIGNAR: {len(permisos_sin_asignar)}")
        for perm in permisos_sin_asignar[:5]:
            print(f"   - {perm}")

    return {'sin_asignar': len(permisos_sin_asignar)}


def auditar_usuarios():
    """Audita usuarios y sus permisos"""
    print_section("4. USUARIOS SIN PROTECCIÓN")

    usuarios = User.objects.filter(is_active=True).annotate(
        num_roles=Count('asignaciones_rol', filter=Q(asignaciones_rol__activa=True)),
        num_permisos_directos=Count('permisos_directos', filter=Q(permisos_directos__activo=True))
    ).filter(
        num_roles=0,
        num_permisos_directos=0,
        is_superuser=False
    )

    total = usuarios.count()

    if total == 0:
        print("\n✅ Todos los usuarios tienen roles o permisos asignados")
    else:
        print(f"\n❌ Encontrados {total} usuarios activos sin protección:\n")
        print(f"{'Username':<25} {'Email':<35} {'Fecha registro'}")
        print(f"{'-'*25} {'-'*35} {'-'*15}")

        for usuario in usuarios[:20]:
            username = usuario.username[:23] + '..' if len(usuario.username) > 25 else usuario.username
            email = usuario.email[:33] + '..' if len(usuario.email) > 35 else usuario.email
            fecha = usuario.date_joined.strftime('%Y-%m-%d')
            print(f"{username:<25} {email:<35} {fecha}")

        if total > 20:
            print(f"\n... y {total - 20} usuarios más")

    return {'sin_proteccion': total}


def auditar_asignaciones():
    """Audita asignaciones de roles"""
    print_section("5. ASIGNACIONES DE ROLES")

    asignaciones = AsignacionRol.objects.filter(activa=True).select_related('usuario', 'rol')

    total = asignaciones.count()
    now = timezone.now()

    vigentes = 0
    expiradas = 0
    futuras = 0

    for asig in asignaciones:
        if asig.esta_vigente():
            vigentes += 1
        elif asig.fecha_fin and asig.fecha_fin < now:
            expiradas += 1
        elif asig.fecha_inicio and asig.fecha_inicio > now:
            futuras += 1

    print(f"\nTotal asignaciones activas: {total}")
    print(f"   Vigentes: {vigentes}")
    print(f"   Expiradas (requieren limpieza): {expiradas}")
    print(f"   Futuras (aún no inician): {futuras}")

    if expiradas > 0:
        print(f"\n⚠️  Hay {expiradas} asignaciones que deben desactivarse")
        print("   Ejecutar: python manage.py limpiar_asignaciones_expiradas")

    return {'expiradas': expiradas}


def detectar_problemas(stats):
    """Detecta y muestra problemas"""
    print_section("6. PROBLEMAS DETECTADOS")

    problemas = []

    if stats['usuarios_sin_roles'] > 0:
        problemas.append(f"❌ ALTA: {stats['usuarios_sin_roles']} usuarios sin roles ni permisos")

    if stats['roles_sin_permisos'] > 0:
        problemas.append(f"⚠️  MEDIA: {stats['roles_sin_permisos']} roles activos sin permisos")

    if stats['permisos_sin_asignar'] > 10:
        problemas.append(f"ℹ️  BAJA: {stats['permisos_sin_asignar']} permisos sin asignar")

    if stats['asignaciones_expiradas'] > 0:
        problemas.append(f"⚠️  MEDIA: {stats['asignaciones_expiradas']} asignaciones expiradas")

    if stats['superusuarios'] > 3:
        problemas.append(f"❌ ALTA: {stats['superusuarios']} superusuarios (demasiados)")

    if not problemas:
        print("\n✅ No se detectaron problemas críticos")
    else:
        print()
        for i, problema in enumerate(problemas, 1):
            print(f"{i}. {problema}")


def generar_recomendaciones(stats):
    """Genera recomendaciones"""
    print_section("7. RECOMENDACIONES")

    recomendaciones = []

    if stats['usuarios_sin_roles'] > 0:
        recomendaciones.append("Asignar roles a los usuarios sin protección")

    if stats['asignaciones_expiradas'] > 0:
        recomendaciones.append("Ejecutar limpieza de asignaciones expiradas")

    if stats['roles_sin_permisos'] > 5:
        recomendaciones.append("Asignar permisos o desactivar roles vacíos")

    recomendaciones.append("Configurar auditoría periódica (semanal)")
    recomendaciones.append("Revisar periódicamente usuarios con permisos críticos")

    if recomendaciones:
        print()
        for i, rec in enumerate(recomendaciones, 1):
            print(f"{i}. {rec}")


def main():
    """Función principal"""
    print_header("AUDITORÍA DEL SISTEMA DE PERMISOS Y ROLES")
    print(f"Fecha: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Estadísticas generales
    stats = {}
    stats.update(auditar_resumen())

    # Detalles de roles
    rol_stats = auditar_roles()
    stats.update(rol_stats)

    # Detalles de permisos
    perm_stats = auditar_permisos()
    stats.update(perm_stats)

    # Usuarios sin protección
    user_stats = auditar_usuarios()
    stats.update(user_stats)

    # Asignaciones
    asig_stats = auditar_asignaciones()
    stats.update(asig_stats)

    # Problemas y recomendaciones
    detectar_problemas(stats)
    generar_recomendaciones(stats)

    # Resumen final
    print_section("RESUMEN FINAL")

    total_problemas = 0
    if stats['usuarios_sin_roles'] > 0:
        total_problemas += 1
    if stats['roles_sin_permisos'] > 0:
        total_problemas += 1
    if stats['asignaciones_expiradas'] > 0:
        total_problemas += 1
    if stats['superusuarios'] > 3:
        total_problemas += 1

    print(f"\nProblemas detectados: {total_problemas}")

    if total_problemas == 0:
        print("\n✅ ESTADO DEL SISTEMA: SALUDABLE")
    elif stats['usuarios_sin_roles'] > 0 or stats['superusuarios'] > 5:
        print("\n❌ ESTADO DEL SISTEMA: REQUIERE ATENCIÓN INMEDIATA")
    else:
        print("\n⚠️  ESTADO DEL SISTEMA: REQUIERE MEJORAS")

    print(f"\n{'='*80}\n")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error durante la auditoría: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
