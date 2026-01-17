#!/usr/bin/env python
"""Script para revisar ConfiguracionGeneral en la base de datos"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from configuracion.models import ConfiguracionGeneral

print("=" * 80)
print("REVISIÓN DE CONFIGURACIONES GENERALES")
print("=" * 80)

total = ConfiguracionGeneral.objects.count()
print(f"\n📊 Total de registros: {total}\n")

if total > 0:
    print("📋 Listado de configuraciones:\n")
    for config in ConfiguracionGeneral.objects.all():
        print(f"  ID: {config.id}")
        print(f"  Nombre Empresa: '{config.nombre_empresa}'")
        print(f"  NIT: '{config.nit}'")
        print(f"  Dirección: '{config.direccion}'")
        print(f"  Teléfono: '{config.telefono}'")
        print(f"  Email: '{config.email}'")
        print(f"  Sitio Web: '{config.sitio_web}'")
        print(f"  Fecha Modificación: {config.fecha_modificacion}")
        print("-" * 80)
    
    print(f"\n🔍 Usando .first():")
    first_config = ConfiguracionGeneral.objects.first()
    if first_config:
        print(f"  ID: {first_config.id}")
        print(f"  Nombre: '{first_config.nombre_empresa}'")
    else:
        print("  ❌ .first() retornó None!")
    
    print(f"\n🔍 Usando .filter().first():")
    filter_first = ConfiguracionGeneral.objects.filter().first()
    if filter_first:
        print(f"  ID: {filter_first.id}")
        print(f"  Nombre: '{filter_first.nombre_empresa}'")
    else:
        print("  ❌ .filter().first() retornó None!")
else:
    print("❌ No hay registros en la tabla")

print("\n" + "=" * 80)
