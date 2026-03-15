"""
Configuración de Celery para CorteSec - FASE 3 Mejorada
"""

import os
from celery import Celery
from celery.schedules import crontab

# Establecer el módulo de configuración de Django para Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')

# Crear instancia de Celery
app = Celery('contractor_management')

# Cargar configuración desde Django settings
# El namespace 'CELERY' significa que todas las config keys relacionadas
# con Celery deben tener el prefijo 'CELERY_' en settings.py
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-descubrir tareas en todos los módulos registrados
# Esto buscará archivos 'tasks.py' en cada app de INSTALLED_APPS
app.autodiscover_tasks()

# ============================================
# FASE 3: CONFIGURACIÓN DE TAREAS PROGRAMADAS
# ============================================

# Configuración de beat schedule (tareas programadas)
app.conf.beat_schedule = {
    # ===== TAREAS CONTABILIDAD =====
    'auditoria-puc-diaria': {
        'task': 'contabilidad.tasks.auditoria_puc_diaria',
        'schedule': crontab(minute=0, hour=6),
    },
    'auditoria-puc-semanal': {
        'task': 'contabilidad.tasks.auditoria_puc_semanal',
        'schedule': crontab(minute=0, hour=3, day_of_week=0),
    },
}

# Configuración de timezone
app.conf.timezone = 'America/Bogota'

# Configuración de serialización
app.conf.task_serializer = 'json'
app.conf.result_serializer = 'json'
app.conf.accept_content = ['json']

# Configuración de resultados
app.conf.result_backend = 'django-db'
app.conf.result_extended = True

# Configuración de reintentos
app.conf.task_acks_late = True
app.conf.task_reject_on_worker_lost = True


@app.task(bind=True)
def debug_task(self):
    """Tarea de depuración para verificar que Celery funciona"""
    print(f'Request: {self.request!r}')
