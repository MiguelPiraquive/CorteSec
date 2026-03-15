import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')

# Suprimir el emoji problemático temporalmente
import sys
sys.stdout.reconfigure(encoding='utf-8')

django.setup()

from django.db import connection

sql = """
-- Add organization_id to RBAC tables
ALTER TABLE permisos_restriccion_campo ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizacion(id) ON DELETE CASCADE;
ALTER TABLE permisos_restriccion_registro ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizacion(id) ON DELETE CASCADE;
ALTER TABLE permisos_solicitud_aprobacion ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizacion(id) ON DELETE CASCADE;
ALTER TABLE permisos_ui ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizacion(id) ON DELETE CASCADE;
ALTER TABLE permisos_delegacion ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizacion(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS permisos_re_organizacion_idx001 ON permisos_restriccion_campo(organization_id);
CREATE INDEX IF NOT EXISTS permisos_re_organizacion_idx002 ON permisos_restriccion_registro(organization_id);
CREATE INDEX IF NOT EXISTS permisos_so_organizacion_idx003 ON permisos_solicitud_aprobacion(organization_id);
CREATE INDEX IF NOT EXISTS permisos_ui_organizacion_idx004 ON permisos_ui(organization_id);
CREATE INDEX IF NOT EXISTS permisos_de_organizacion_idx005 ON permisos_delegacion(organization_id);
"""

with connection.cursor() as cursor:
    for statement in sql.strip().split(';'):
        if statement.strip():
            print(f"Executing: {statement[:80]}...")
            cursor.execute(statement)
    
    # Set default organization for existing records
    print("\nSetting default organization for existing records...")
    cursor.execute("SELECT id FROM core_organizacion LIMIT 1")
    row = cursor.fetchone()
    
    if row:
        org_id = row[0]
        print(f"Using organization: {org_id}")
        
        tables = [
            'permisos_restriccion_campo',
            'permisos_restriccion_registro',
            'permisos_solicitud_aprobacion', 
            'permisos_ui',
            'permisos_delegacion'
        ]
        
        for table in tables:
            cursor.execute(f"UPDATE {table} SET organization_id = %s WHERE organization_id IS NULL", [org_id])
            updated = cursor.rowcount
            print(f"  {table}: {updated} rows updated")
    
print("\n✅ All columns added successfully!")
