"""
Script para verificar el usuario actual y su organización
"""

import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from login.models import CustomUser

print("\n" + "="*80)
print("USUARIOS CON SUPERUSER O STAFF")
print("="*80 + "\n")

superusers = CustomUser.objects.filter(is_superuser=True)
print(f"Superusuarios encontrados: {superusers.count()}\n")

for user in superusers:
    org_name = user.organization.nombre if user.organization else "SIN ORGANIZACIÓN"
    print(f"  - {user.username:20} | Email: {user.email:30} | Org: {org_name}")

print("\n" + "="*80)
