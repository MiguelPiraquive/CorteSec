#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== INICIANDO BUILD SCRIPT ==="

# Install dependencies
echo "📦 Instalando dependencias..."
pip install -r requirements.txt

# Verificar que la carpeta static existe
echo "📁 Verificando carpeta static..."
if [ -d "static" ]; then
    echo "✅ Carpeta static encontrada"
    ls -la static/
else
    echo "❌ Error: Carpeta static no encontrada"
    exit 1
fi

# Collect static files - con más verbosidad
echo "📋 Ejecutando collectstatic..."
python manage.py collectstatic --no-input --verbosity=2

# Verificar que se crearon los archivos estáticos
echo "🔍 Verificando archivos estáticos generados..."
if [ -d "staticfiles" ]; then
    echo "✅ Carpeta staticfiles creada"
    echo "📊 Archivos en staticfiles:"
    find staticfiles/ -name "*.css" -o -name "*.js" | head -10
else
    echo "❌ Error: Carpeta staticfiles no fue creada"
    exit 1
fi

# Apply any outstanding database migrations
echo "🗃️ Aplicando migraciones..."
python manage.py migrate --noinput

# Create superuser if it doesn't exist
if [[ $CREATE_SUPERUSER ]];
then
  python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@cortesec.com', 'admin123')
    print('Superuser created')
else:
    print('Superuser already exists')
"
fi
