"""
Script para verificar organizaciones de usuarios
"""

import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from login.models import CustomUser

print("\n" + "="*80)
print("USUARIOS Y SUS ORGANIZACIONES")
print("="*80 + "\n")

# Obtener los usuarios que aparecen en la imagen
usernames = [
    'Turris4', 'Turris', 'piraquive', 'isolated_user', 'test_super',
    'test_user_isolated', 'test_user_secondary', 'test_user_primary',
    'test_admin_primary', 'test_superuser', 'test_user_org2', 'test_user'
]

for username in usernames:
    try:
        user = CustomUser.objects.get(username=username)
        org_name = user.organization.nombre if user.organization else "SIN ORGANIZACIÓN"
        org_id = user.organization.id if user.organization else "N/A"
        print(f"Usuario: {username:25} | Org: {org_name:30} | ID: {org_id}")
    except CustomUser.DoesNotExist:
        print(f"Usuario: {username:25} | NO EXISTE")

print("\n" + "="*80)
print("RESUMEN POR ORGANIZACIÓN")
print("="*80 + "\n")

from core.models import Organization

for org in Organization.objects.all():
    count = CustomUser.objects.filter(organization=org).count()
    print(f"{org.nombre:40} : {count} usuarios")

print("\n")
