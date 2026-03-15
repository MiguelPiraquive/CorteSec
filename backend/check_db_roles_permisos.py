#!/usr/bin/env python
"""Script para verificar roles y permisos en la base de datos"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from roles.models import Rol, TipoRol, AsignacionRol, EstadoAsignacion
from permisos.models import Permiso, TipoPermiso, ModuloSistema

print("="*80)
print("ANÁLISIS DE ROLES Y PERMISOS EN BASE DE DATOS")
print("="*80)

# ROLES
print("\n" + "="*80)
print("📊 RESUMEN DE ROLES")
print("="*80)
print(f"Total de Roles: {Rol.objects.count()}")
print(f"Roles Activos: {Rol.objects.filter(activo=True).count()}")
print(f"Roles Inactivos: {Rol.objects.filter(activo=False).count()}")
print(f"Roles del Sistema: {Rol.objects.filter(es_sistema=True).count()}")
print(f"Tipos de Rol: {TipoRol.objects.count()}")
print(f"Asignaciones de Rol: {AsignacionRol.objects.count()}")
print(f"Estados de Asignación: {EstadoAsignacion.objects.count()}")

print("\n" + "-"*80)
print("📋 ROLES EXISTENTES:")
print("-"*80)
for idx, rol in enumerate(Rol.objects.all().order_by('id'), 1):
    permisos_count = rol.permisos.count()
    tipo = rol.tipo_rol.nombre if hasattr(rol, 'tipo_rol') and rol.tipo_rol else 'N/A'
    print(f"{idx:2}. [{rol.id:3}] {rol.codigo:25} | {rol.nombre:30} | Activo: {str(rol.activo):5} | Permisos: {permisos_count:3} | Tipo: {tipo}")

print("\n" + "-"*80)
print("📋 TIPOS DE ROL:")
print("-"*80)
for idx, tipo in enumerate(TipoRol.objects.all().order_by('orden'), 1):
    roles_count = Rol.objects.filter(tipo_rol=tipo).count()
    print(f"{idx}. [{tipo.id}] {tipo.nombre:20} | Activo: {tipo.activo} | Roles usando: {roles_count}")

# PERMISOS
print("\n" + "="*80)
print("📊 RESUMEN DE PERMISOS")
print("="*80)
print(f"Total de Permisos: {Permiso.objects.count()}")
print(f"Permisos Activos: {Permiso.objects.filter(activo=True).count()}")
print(f"Tipos de Permiso: {TipoPermiso.objects.count()}")
print(f"Módulos del Sistema: {ModuloSistema.objects.count()}")

print("\n" + "-"*80)
print("📋 MÓDULOS DEL SISTEMA:")
print("-"*80)
for idx, modulo in enumerate(ModuloSistema.objects.all().order_by('codigo'), 1):
    permisos_count = Permiso.objects.filter(modulo=modulo).count()
    print(f"{idx:2}. [{modulo.id}] {modulo.codigo:20} | {modulo.nombre:30} | Activo: {str(modulo.activo):5} | Permisos: {permisos_count:3}")

print("\n" + "-"*80)
print("📋 TIPOS DE PERMISO:")
print("-"*80)
for idx, tipo in enumerate(TipoPermiso.objects.all().order_by('codigo'), 1):
    permisos_count = Permiso.objects.filter(tipo_permiso=tipo).count()
    print(f"{idx}. [{tipo.id}] {tipo.codigo:10} | {tipo.nombre:30} | Permisos usando: {permisos_count}")

print("\n" + "-"*80)
print("📋 PERMISOS POR MÓDULO (primeros 50):")
print("-"*80)
for idx, permiso in enumerate(Permiso.objects.all().select_related('modulo', 'tipo_permiso').order_by('modulo__codigo', 'codigo')[:50], 1):
    modulo_nombre = permiso.modulo.nombre if permiso.modulo else 'Sin módulo'
    tipo_nombre = permiso.tipo_permiso.codigo if permiso.tipo_permiso else 'N/A'
    print(f"{idx:2}. [{permiso.id}] {modulo_nombre:20} | {tipo_nombre:10} | {permiso.codigo:35} | {permiso.nombre[:40]}")

if Permiso.objects.count() > 50:
    print(f"\n... y {Permiso.objects.count() - 50} permisos más")

# ESTADÍSTICAS ADICIONALES
print("\n" + "="*80)
print("📈 ESTADÍSTICAS DE USO")
print("="*80)
print(f"Roles con permisos asignados: {Rol.objects.filter(permisos__isnull=False).distinct().count()}")
print(f"Roles sin permisos: {Rol.objects.filter(permisos__isnull=True).count()}")
print(f"Total de relaciones Rol-Permiso: {sum(r.permisos.count() for r in Rol.objects.all())}")

print("\n" + "="*80)
print("✅ ANÁLISIS COMPLETADO")
print("="*80)
