#!/usr/bin/env python
"""Verificar ConfiguracionSeguridad"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from configuracion.models import ConfiguracionSeguridad
from core.models import Organization

print("=" * 80)
print("CONFIGURACIÓN DE SEGURIDAD")
print("=" * 80)

total = ConfiguracionSeguridad.objects.count()
print(f"\nTotal: {total}\n")

config = ConfiguracionSeguridad.objects.first()

if config:
    print(f"✅ Existe ConfiguracionSeguridad")
    print(f"   ID: {config.id}")
    print(f"   Organization: {config.organization}")
    print(f"   Tiempo sesión: {config.tiempo_sesion} min")
    print(f"   Max intentos login: {config.max_intentos_login}")
    print(f"   Días expiración password: {config.dias_expiracion_password}")
    
    # Verificar si tiene organization
    if not config.organization:
        print(f"\n⚠️  No tiene organization asignada!")
        org = Organization.objects.first()
        if org:
            config.organization = org
            config.save()
            print(f"✅ Organization asignada: {org}")
        else:
            print("❌ No hay organizations en el sistema")
else:
    print("❌ No existe ConfiguracionSeguridad, creando...")
    org = Organization.objects.first()
    if org:
        config = ConfiguracionSeguridad.objects.create(organization=org)
        print(f"✅ Creada con ID: {config.id}")
        print(f"   Organization: {org}")
    else:
        print("❌ No hay organizations, creando sin organization")
        config = ConfiguracionSeguridad.objects.create()
        print(f"⚠️  Creada sin organization ID: {config.id}")

print("\n" + "=" * 80)
