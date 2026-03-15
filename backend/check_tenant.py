#!/usr/bin/env python
"""Script para verificar tenant del usuario"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Organizacion  # Cambiado de Organization a Organizacion

User = get_user_model()
email = 'piraquivemiguel6@gmail.com'

print("="*80)
print("VERIFICANDO TENANT/ORGANIZACIÓN")
print("="*80)

user = User.objects.filter(email=email).first()

if user:
    print(f"\n✅ Usuario: {user.username}")
    
    # Verificar organizaciones
    print(f"\n📊 Organizaciones:")
    orgs = Organizacion.objects.filter(activa=True)
    print(f"  Total organizaciones activas: {orgs.count()}")
    
    for org in orgs:
        print(f"\n  🏢 {org.nombre}")  # Cambiado de name a nombre
        print(f"     Código: {org.codigo}")
        print(f"     Slug: {org.slug}")
        print(f"     Activa: {org.activa}")  # Cambiado de is_active a activa
    
    # Verificar si el usuario tiene organización asignada
    if hasattr(user, 'organization'):
        print(f"\n✅ Organización del usuario:")
        print(f"  Nombre: {user.organization.nombre}")
        print(f"  Código: {user.organization.codigo}")
        print(f"  Slug: {user.organization.slug}")
    else:
        print(f"\n⚠️ El usuario NO tiene campo 'organization'")
        print(f"  Verificando otros campos relacionados con tenant...")
        
        # Buscar cualquier relación con organización
        for field in user._meta.get_fields():
            if 'org' in field.name.lower() or 'tenant' in field.name.lower():
                print(f"  - Campo encontrado: {field.name} ({field.__class__.__name__})")

print("\n" + "="*80)
print("RECOMENDACIONES:")
print("="*80)
print("""
Si el frontend muestra 0 roles, probablemente sea por:

1. **Falta de headers de tenant**: El backend require:
   - X-Tenant-Codigo
   - X-Tenant-Slug
   
2. **Token de autenticación**: Verificar en localStorage:
   - authToken
   - tenantCode
   - tenantSlug

3. **CORS**: El backend debe permitir el origen del frontend

SOLUCIÓN TEMPORAL:
- Deshabilitar MultiTenantViewSetMixin en RolViewSet
- O configurar el tenant en el login del usuario
""")
