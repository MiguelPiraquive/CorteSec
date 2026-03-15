import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.db import connection

tables = [
    'permisos_restriccion_campo',
    'permisos_restriccion_registro', 
    'permisos_delegacion',
    'permisos_solicitud_aprobacion',
    'permisos_ui'
]

cursor = connection.cursor()

for table in tables:
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position
    """, [table])
    
    columns = cursor.fetchall()
    print(f"\n=== {table} ===")
    for col_name, data_type in columns:
        print(f"  {col_name}: {data_type}")
