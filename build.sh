#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Making migrations for all apps..."
python manage.py makemigrations

echo "Applying database migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --no-input

# Create superuser if it doesn't exist
if [[ $CREATE_SUPERUSER ]];
then
  echo "Creating superuser..."
  python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@cortesec.com', 'admin123')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
"
fi

echo "Build completed successfully!"
