#!/usr/bin/env python
"""
Script para verificar que ConfiguracionGeneral ahora solo tenga campos de empresa
y que los campos de seguridad hayan sido eliminados correctamente.
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from configuracion.models import ConfiguracionGeneral, ConfiguracionSeguridad, ConfiguracionEmail
from django.db import connection

print("=" * 80)
print("VERIFICACIÓN DE LIMPIEZA DE CAMPOS DUPLICADOS")
print("=" * 80)

# 1. Verificar campos del modelo ConfiguracionGeneral
print("\n📋 CAMPOS ACTUALES DE ConfiguracionGeneral:")
print("-" * 80)
fields = ConfiguracionGeneral._meta.get_fields()
field_names = [f.name for f in fields if not f.name.startswith('_')]
for field_name in sorted(field_names):
    print(f"  ✓ {field_name}")

# 2. Verificar que los campos duplicados fueron eliminados
print("\n🗑️ VERIFICANDO ELIMINACIÓN DE CAMPOS DUPLICADOS:")
print("-" * 80)
removed_fields = [
    'sesion_timeout_minutos',
    'max_intentos_login', 
    'requiere_cambio_password',
    'dias_cambio_password',
    'servidor_email',
    'puerto_email',
    'email_usuario',
    'usar_tls'
]

for field in removed_fields:
    if field in field_names:
        print(f"  ❌ {field} - TODAVÍA EXISTE (ERROR)")
    else:
        print(f"  ✅ {field} - Eliminado correctamente")

# 3. Verificar que ConfiguracionSeguridad tenga los campos
print("\n🔒 CAMPOS DE SEGURIDAD EN ConfiguracionSeguridad:")
print("-" * 80)
seg_fields = ConfiguracionSeguridad._meta.get_fields()
seg_field_names = [f.name for f in seg_fields if not f.name.startswith('_')]
security_fields = [
    'tiempo_sesion',
    'max_intentos_login',
    'tiempo_bloqueo',
    'longitud_minima_password',
    'dias_expiracion_password'
]
for field in security_fields:
    if field in seg_field_names:
        print(f"  ✅ {field} - Existe")
    else:
        print(f"  ❌ {field} - NO EXISTE (ERROR)")

# 4. Verificar que ConfiguracionEmail tenga los campos
print("\n📧 CAMPOS DE EMAIL EN ConfiguracionEmail:")
print("-" * 80)
email_fields = ConfiguracionEmail._meta.get_fields()
email_field_names = [f.name for f in email_fields if not f.name.startswith('_')]
email_required = [
    'servidor_smtp',
    'puerto_smtp',
    'usuario_smtp',
    'usar_tls'
]
for field in email_required:
    if field in email_field_names:
        print(f"  ✅ {field} - Existe")
    else:
        print(f"  ❌ {field} - NO EXISTE (ERROR)")

# 5. Verificar columnas en la base de datos
print("\n💾 VERIFICACIÓN EN BASE DE DATOS:")
print("-" * 80)
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'configuracion_configuraciongeneral'
        ORDER BY ordinal_position
    """)
    db_columns = [row[0] for row in cursor.fetchall()]
    
print(f"Total de columnas en DB: {len(db_columns)}")
for removed in removed_fields:
    # Convertir nombre de Python a nombre de DB
    db_field = removed  # Django usa el mismo nombre
    if db_field in db_columns:
        print(f"  ⚠️ {db_field} - TODAVÍA EXISTE EN DB")
    else:
        print(f"  ✅ {db_field} - Eliminada de DB")

# 6. Intentar cargar ConfiguracionGeneral
print("\n🔍 PRUEBA DE CARGA DE DATOS:")
print("-" * 80)
try:
    config = ConfiguracionGeneral.objects.first()
    if config:
        print(f"✅ ConfiguracionGeneral cargada correctamente")
        print(f"   ID: {config.id}")
        print(f"   Empresa: {config.nombre_empresa}")
        print(f"   NIT: {config.nit}")
        print(f"   Organization: {config.organization}")
    else:
        print("⚠️ No hay ConfiguracionGeneral en la base de datos")
except Exception as e:
    print(f"❌ Error al cargar: {e}")

print("\n" + "=" * 80)
print("✅ VERIFICACIÓN COMPLETADA")
print("=" * 80)
