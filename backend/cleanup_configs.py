#!/usr/bin/env python
"""Script para limpiar ConfiguracionGeneral duplicadas"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from configuracion.models import ConfiguracionGeneral

print("=" * 80)
print("LIMPIEZA DE CONFIGURACIONES DUPLICADAS")
print("=" * 80)

total_antes = ConfiguracionGeneral.objects.count()
print(f"\n📊 Total ANTES: {total_antes} registros\n")

# Buscar la mejor configuración (la más reciente con datos completos)
configs_cortesec = ConfiguracionGeneral.objects.filter(
    nombre_empresa__icontains='cortesec'
).order_by('-fecha_modificacion')

if configs_cortesec.exists():
    config_a_mantener = configs_cortesec.first()
    print(f"✅ Configuración a mantener:")
    print(f"   ID: {config_a_mantener.id}")
    print(f"   Nombre: {config_a_mantener.nombre_empresa}")
    print(f"   NIT: {config_a_mantener.nit}")
    print(f"   Dirección: {config_a_mantener.direccion}")
    print(f"   Email: {config_a_mantener.email}")
    print(f"   Sitio Web: {config_a_mantener.sitio_web}")
    print(f"   Fecha: {config_a_mantener.fecha_modificacion}\n")
    
    # Eliminar TODAS las demás configuraciones
    configuraciones_a_eliminar = ConfiguracionGeneral.objects.exclude(id=config_a_mantener.id)
    count_eliminadas = configuraciones_a_eliminar.count()
    
    print(f"🗑️  Eliminando {count_eliminadas} configuraciones duplicadas...")
    configuraciones_a_eliminar.delete()
    
    total_despues = ConfiguracionGeneral.objects.count()
    print(f"\n📊 Total DESPUÉS: {total_despues} registro(s)\n")
    
    if total_despues == 1:
        print("✅ ¡Limpieza completada exitosamente!")
        print("   Solo queda 1 configuración única")
    else:
        print(f"⚠️  Aún quedan {total_despues} configuraciones")
else:
    # Si no hay ninguna de CorteSec, mantener la más reciente
    print("⚠️  No se encontró configuración de CorteSec")
    config_a_mantener = ConfiguracionGeneral.objects.order_by('-fecha_modificacion').first()
    if config_a_mantener:
        print(f"✅ Manteniendo la más reciente:")
        print(f"   ID: {config_a_mantener.id}")
        print(f"   Nombre: {config_a_mantener.nombre_empresa}")
        
        configuraciones_a_eliminar = ConfiguracionGeneral.objects.exclude(id=config_a_mantener.id)
        count_eliminadas = configuraciones_a_eliminar.count()
        
        print(f"\n🗑️  Eliminando {count_eliminadas} configuraciones duplicadas...")
        configuraciones_a_eliminar.delete()

print("\n" + "=" * 80)
