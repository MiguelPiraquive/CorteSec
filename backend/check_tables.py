import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("""
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname='public' AND tablename LIKE 'permisos_%' 
    ORDER BY tablename
""")

tables = cursor.fetchall()
print("\n=== Tablas de permisos existentes ===")
for table in tables:
    print(f"  - {table[0]}")

print(f"\nTotal: {len(tables)} tablas")

# Verificar tablas esperadas de la migración 0002 (con nombres reales en DB)
expected_tables = [
    'permisos_restriccion_campo',
    'permisos_restriccion_registro',
    'permisos_delegacion',
    'permisos_solicitud_aprobacion',
    'permisos_ui'
]

existing_table_names = [t[0] for t in tables]
print("\n=== Verificación de tablas esperadas ===")
for table in expected_tables:
    status = "✓ EXISTE" if table in existing_table_names else "✗ FALTA"
    print(f"  {status}: {table}")
