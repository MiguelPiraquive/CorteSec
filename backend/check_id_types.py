import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.db import connection

tables_to_check = [
    'permisos_modulosistema',
    'permisos_tipopermiso',
    'permisos_condicionpermiso',
    'permisos_permiso',
    'permisos_permisodirecto',
    'roles_tiporol',
    'roles_rol',
    'roles_estadoasignacion',
    'roles_asignacionrol',
]

print("=== TIPOS DE COLUMNA ID ===\n")

with connection.cursor() as cursor:
    for table in tables_to_check:
        try:
            cursor.execute("""
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = %s AND column_name = 'id'
            """, [table])
            result = cursor.fetchone()
            if result:
                print(f"{table:40} -> {result[1]:15} ({result[2]})")
            else:
                print(f"{table:40} -> Tabla no existe o sin columna 'id'")
        except Exception as e:
            print(f"{table:40} -> ERROR: {e}")
