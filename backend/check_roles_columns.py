import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name,data_type
        FROM information_schema.columns
        WHERE table_name = 'roles_rol'
        ORDER BY ordinal_position
    """)

    print("=== COLUMNAS EN roles_rol ===\n")
    for row in cursor.fetchall():
        print(f"{row[0]:30} -> {row[1]}")
