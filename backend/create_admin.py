from django.contrib.auth import get_user_model
from core.models import Organization

User = get_user_model()
org = Organization.objects.first()

print(f"Organización: {org}")
print(f"Total usuarios: {User.objects.count()}")

# Verificar/crear superusuario
admin_email = "admin@cortesec.com"
superuser = User.objects.filter(email=admin_email).first()

if not superuser:
    print(f"Creando superusuario {admin_email}...")
    superuser = User.objects.create_superuser(
        username='admin',
        email=admin_email,
        password='admin123456',
        first_name='Admin',
        last_name='CorteSec'
    )
    print(f"Superusuario creado: {superuser.email}")

# Asignar organización
superuser.organization = org
superuser.is_superuser = True
superuser.is_staff = True
superuser.save()
print(f"Organización {org.codigo} asignada a {superuser.email}")

# También asignar org al usuario actual si no tiene
for u in User.objects.filter(organization__isnull=True):
    u.organization = org
    u.save()
    print(f"Organización asignada a {u.email}")

# Verificar usuarios actuales
print("\nUsuarios en el sistema:")
for u in User.objects.all():
    print(f"  - {u.email}, Org: {getattr(u, 'organization', None)}, Superuser: {u.is_superuser}")
