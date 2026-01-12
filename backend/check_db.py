import sqlite3
import os

db_path = 'db.sqlite3'

# Verificar si existe
if not os.path.exists(db_path):
    print("DB no existe, creando nueva...")
    open(db_path, 'w').close()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Ver tablas existentes
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

if tables:
    print(f"Tablas encontradas: {tables}")
    
    # Verificar si existe django_migrations
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='django_migrations'")
    if cursor.fetchone():
        cursor.execute("SELECT app, name FROM django_migrations ORDER BY id")
        migrations = cursor.fetchall()
        print(f"\nMigraciones aplicadas ({len(migrations)}):")
        for m in migrations[:20]:  # Mostrar solo las primeras 20
            print(f"  - {m[0]}.{m[1]}")
        if len(migrations) > 20:
            print(f"  ... y {len(migrations) - 20} más")
else:
    print("Base de datos VACÍA - lista para migraciones")

conn.close()
