#!/usr/bin/env python
"""Backfill de organization en registros existentes (roles/permisos)."""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from core.models import Organizacion
from roles.models import Rol, TipoRol, EstadoAsignacion, AsignacionRol
from permisos.models import ModuloSistema, TipoPermiso, Permiso  # AsignacionPermiso removed

org = Organizacion.objects.filter(activa=True).first()
if not org:
    raise SystemExit("No hay organización activa.")

print(f"Usando organización: {org.nombre} ({org.codigo})")

updates = []

def backfill(model, name):
    qs = model.objects.filter(organization__isnull=True)
    count = qs.count()
    if count:
        qs.update(organization=org)
    updates.append((name, count))

backfill(TipoRol, "TipoRol")
backfill(Rol, "Rol")
backfill(EstadoAsignacion, "EstadoAsignacion")
backfill(AsignacionRol, "AsignacionRol")

backfill(ModuloSistema, "ModuloSistema")
backfill(TipoPermiso, "TipoPermiso")
backfill(Permiso, "Permiso")
# backfill(AsignacionPermiso, "AsignacionPermiso")  # Model removed

print("\nBackfill completado:")
for name, count in updates:
    print(f"- {name}: {count} registros actualizados")
