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
    # ===== TAREAS DE NÓMINA (FASE 3) =====
    # Verificar estado de nóminas enviadas cada 30 minutos
    'verificar-estado-nominas-dian': {
        'task': 'payroll.tasks.verificar_estado_nominas_dian',
        'schedule': crontab(minute='*/30'),
    },
    # Generar nóminas pendientes cada hora
    'procesar-nominas-pendientes': {
        'task': 'payroll.tasks.procesar_nominas_pendientes',
        'schedule': crontab(minute=0, hour='*'),
    },
    # Enviar recordatorios de nóminas sin firmar cada día a las 9 AM
    'recordatorio-nominas-sin-firmar': {
        'task': 'payroll.tasks.recordatorio_nominas_sin_firmar',
        'schedule': crontab(minute=0, hour=9),
    },
    # Limpiar XMLs antiguos cada domingo a las 2 AM
    'limpiar-xmls-antiguos': {
        'task': 'payroll.tasks.limpiar_xmls_antiguos',
        'schedule': crontab(minute=0, hour=2, day_of_week=0),
    },
    # Generar reporte de estadísticas semanal (lunes 8 AM)
    'generar-reporte-semanal': {
        'task': 'payroll.tasks.generar_reporte_semanal',
        'schedule': crontab(minute=0, hour=8, day_of_week=1),
    },
    
    # ===== TAREAS DE ROLES =====
    # Verificar roles expirados cada hora
    'verificar-roles-expirados-cada-hora': {
        'task': 'roles.tasks.verificar_roles_expirados',
        'schedule': crontab(minute=0, hour='*'),
    },
    # Notificar roles próximos a expirar cada día a las 9 AM
    'notificar-roles-proximos-expirar-diario': {
        'task': 'roles.tasks.notificar_roles_proximos_expirar',
        'schedule': crontab(minute=0, hour=9),
    },
    # Actualizar estadísticas de roles cada noche a las 2 AM
    'actualizar-estadisticas-roles-noche': {
        'task': 'roles.tasks.actualizar_estadisticas_roles',
        'schedule': crontab(minute=0, hour=2),
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
