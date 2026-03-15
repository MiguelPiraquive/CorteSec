#!/usr/bin/env python
"""Script para verificar usuario y permisos de API"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.contrib.auth import get_user_model
from roles.models import Rol

User = get_user_model()
email = 'piraquivemiguel6@gmail.com'

print("="*80)
print(f"VERIFICANDO USUARIO: {email}")
print("="*80)

# Buscar usuario
user = User.objects.filter(email=email).first()

if not user:
    print(f"\n❌ Usuario con email '{email}' NO ENCONTRADO en la base de datos")
    print("\nUsuarios existentes:")
    for u in User.objects.all()[:10]:
        print(f"  - {u.username} ({u.email}) - Superuser: {u.is_superuser}")
else:
    print(f"\n✅ Usuario encontrado:")
    print(f"  Username: {user.username}")
    print(f"  Email: {user.email}")
    print(f"  Superuser: {user.is_superuser}")
    print(f"  Staff: {user.is_staff}")
    print(f"  Activo: {user.is_active}")
    print(f"  Último login: {user.last_login}")
    
    print(f"\n📊 Roles asignados:")
    from roles.models import AsignacionRol
    asignaciones = AsignacionRol.objects.filter(usuario=user)
    if asignaciones.exists():
        for asig in asignaciones:
            print(f"  - {asig.rol.nombre} (Estado: {asig.estado.nombre})")
    else:
        print("  ⚠️ Sin roles asignados")

print("\n" + "="*80)
print("VERIFICANDO API DE ROLES")
print("="*80)

print(f"\nTotal de roles en BD: {Rol.objects.count()}")
print(f"Roles activos: {Rol.objects.filter(activo=True).count()}")

# Simular query GET /api/roles/roles/
print("\nPrimeros 5 roles (simulando API):")
for rol in Rol.objects.all()[:5]:
    print(f"  - [{rol.id}] {rol.codigo} - {rol.nombre} (Activo: {rol.activo})")
