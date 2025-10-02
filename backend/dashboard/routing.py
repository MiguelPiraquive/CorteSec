# dashboard/routing.py
from django.urls import re_path, path
from . import websocket_consumer

# WebSocket URL routing para el dashboard
websocket_urlpatterns = [
    # Dashboard en tiempo real
    re_path(r'ws/dashboard/(?P<organization_id>\w+)/$', websocket_consumer.DashboardConsumer.as_asgi()),
    
    # Notificaciones en tiempo real
    re_path(r'ws/notifications/(?P<user_id>\w+)/$', websocket_consumer.NotificationConsumer.as_asgi()),
    
    # Chat en tiempo real (para comunicación entre contratistas)
    re_path(r'ws/chat/(?P<room_name>\w+)/$', websocket_consumer.ChatConsumer.as_asgi()),
    
    # Métricas en tiempo real
    re_path(r'ws/metrics/(?P<organization_id>\w+)/$', websocket_consumer.MetricsConsumer.as_asgi()),
    
    # Actualizaciones de proyectos
    re_path(r'ws/projects/(?P<project_id>\w+)/$', websocket_consumer.ProjectUpdatesConsumer.as_asgi()),
    
    # Sistema de tracking en tiempo real
    re_path(r'ws/tracking/(?P<organization_id>\w+)/$', websocket_consumer.TrackingConsumer.as_asgi()),
    
    # Alertas del sistema
    re_path(r'ws/alerts/(?P<organization_id>\w+)/$', websocket_consumer.AlertsConsumer.as_asgi()),
    
    # Canal general para administradores
    re_path(r'ws/admin/(?P<organization_id>\w+)/$', websocket_consumer.AdminConsumer.as_asgi()),
]

# Grupos de WebSocket para diferentes tipos de usuarios
WEBSOCKET_GROUPS = {
    'dashboard': 'dashboard_updates_{organization_id}',
    'notifications': 'user_notifications_{user_id}',
    'chat': 'chat_room_{room_name}',
    'metrics': 'metrics_updates_{organization_id}',
    'projects': 'project_updates_{project_id}',
    'tracking': 'tracking_updates_{organization_id}',
    'alerts': 'alerts_{organization_id}',
    'admin': 'admin_channel_{organization_id}',
}

# Configuración de permisos por canal
CHANNEL_PERMISSIONS = {
    'dashboard': ['admin', 'manager', 'contractor'],
    'notifications': ['admin', 'manager', 'contractor'],
    'chat': ['admin', 'manager', 'contractor'],
    'metrics': ['admin', 'manager'],
    'projects': ['admin', 'manager', 'contractor'],
    'tracking': ['admin', 'manager'],
    'alerts': ['admin', 'manager'],
    'admin': ['admin'],
}

# Configuración de rate limiting
RATE_LIMITS = {
    'dashboard': {
        'messages_per_minute': 10,
        'burst_limit': 20
    },
    'notifications': {
        'messages_per_minute': 30,
        'burst_limit': 50
    },
    'chat': {
        'messages_per_minute': 60,
        'burst_limit': 100
    },
    'metrics': {
        'messages_per_minute': 5,
        'burst_limit': 10
    },
    'projects': {
        'messages_per_minute': 20,
        'burst_limit': 30
    },
    'tracking': {
        'messages_per_minute': 15,
        'burst_limit': 25
    },
    'alerts': {
        'messages_per_minute': 10,
        'burst_limit': 15
    },
    'admin': {
        'messages_per_minute': 50,
        'burst_limit': 100
    }
}

# Tipos de mensajes permitidos por canal
MESSAGE_TYPES = {
    'dashboard': [
        'get_dashboard_data',
        'subscribe_updates',
        'unsubscribe_updates',
        'refresh_metrics'
    ],
    'notifications': [
        'mark_as_read',
        'get_notifications',
        'subscribe_push',
        'unsubscribe_push'
    ],
    'chat': [
        'send_message',
        'join_room',
        'leave_room',
        'typing_start',
        'typing_stop',
        'get_history'
    ],
    'metrics': [
        'get_live_metrics',
        'subscribe_metric',
        'unsubscribe_metric',
        'reset_metrics'
    ],
    'projects': [
        'get_project_status',
        'update_progress',
        'add_comment',
        'subscribe_project',
        'unsubscribe_project'
    ],
    'tracking': [
        'start_tracking',
        'stop_tracking',
        'get_tracking_data',
        'update_location'
    ],
    'alerts': [
        'get_active_alerts',
        'acknowledge_alert',
        'dismiss_alert',
        'create_alert'
    ],
    'admin': [
        'system_status',
        'user_management',
        'broadcast_message',
        'emergency_notification'
    ]
}

# Configuración de autenticación
AUTHENTICATION_REQUIRED = True
ALLOW_ANONYMOUS_CHANNELS = []  # Canales que permiten usuarios anónimos

# Configuración de logging
WEBSOCKET_LOGGING = {
    'log_connections': True,
    'log_messages': True,
    'log_errors': True,
    'max_log_size': 1000  # Máximo número de logs a mantener
}

# Configuración de heartbeat
HEARTBEAT_INTERVAL = 30  # segundos
HEARTBEAT_TIMEOUT = 60   # segundos

# Configuración de reconexión automática
AUTO_RECONNECT = {
    'enabled': True,
    'max_attempts': 5,
    'backoff_multiplier': 2,
    'initial_delay': 1  # segundos
}

# Middleware para WebSockets
WEBSOCKET_MIDDLEWARE = [
    'dashboard.middleware.WebSocketAuthMiddleware',
    'dashboard.middleware.WebSocketRateLimitMiddleware',
    'dashboard.middleware.WebSocketLoggingMiddleware',
]

# Configuración de compresión
COMPRESSION_ENABLED = True
COMPRESSION_LEVEL = 6  # 1-9, donde 9 es máxima compresión

# Configuración de SSL/TLS para WebSockets
WEBSOCKET_SSL = {
    'enabled': False,  # Habilitar en producción
    'cert_file': None,
    'key_file': None,
    'ca_file': None
}

# Configuración de monitoreo
MONITORING = {
    'enabled': True,
    'metrics_endpoint': '/ws-metrics/',
    'health_check_endpoint': '/ws-health/',
    'collect_connection_stats': True,
    'collect_message_stats': True
}

# Configuración de cache para WebSockets
WEBSOCKET_CACHE = {
    'backend': 'redis',
    'location': 'redis://localhost:6379/1',
    'timeout': 300,  # 5 minutos
    'key_prefix': 'ws_cache'
}

# Configuración de escalabilidad
SCALING = {
    'max_connections_per_worker': 1000,
    'max_channels_per_group': 100,
    'message_queue_size': 1000,
    'worker_pool_size': 4
}

# Handlers de eventos del sistema
EVENT_HANDLERS = {
    'connection_opened': 'dashboard.handlers.on_connection_opened',
    'connection_closed': 'dashboard.handlers.on_connection_closed',
    'message_received': 'dashboard.handlers.on_message_received',
    'error_occurred': 'dashboard.handlers.on_error_occurred',
    'group_joined': 'dashboard.handlers.on_group_joined',
    'group_left': 'dashboard.handlers.on_group_left'
}

# Configuración de filtros de contenido
CONTENT_FILTERS = {
    'enabled': True,
    'max_message_length': 5000,
    'blocked_words': [],  # Lista de palabras bloqueadas
    'sanitize_html': True,
    'allow_markdown': True
}

# Configuración de notificaciones push
PUSH_NOTIFICATIONS = {
    'enabled': True,
    'vapid_public_key': None,  # Configurar en settings
    'vapid_private_key': None, # Configurar en settings
    'vapid_subject': 'mailto:admin@contractor.com'
}

# Configuración de integración con servicios externos
EXTERNAL_INTEGRATIONS = {
    'slack': {
        'enabled': False,
        'webhook_url': None,
        'channels': ['alerts', 'admin']
    },
    'discord': {
        'enabled': False,
        'webhook_url': None,
        'channels': ['alerts']
    },
    'email': {
        'enabled': True,
        'fallback_notifications': True,
        'channels': ['alerts', 'admin']
    }
}

# Configuración de archivo y respaldo
ARCHIVAL = {
    'enabled': True,
    'archive_after_days': 30,
    'backup_location': '/backups/websocket_logs/',
    'compression': True
}

# Configuración de desarrollo y debug
DEBUG_WEBSOCKETS = False  # Habilitar solo en desarrollo
WEBSOCKET_DEBUG_TOOLBAR = False

# Configuración de testing
TESTING = {
    'mock_redis': True,
    'disable_rate_limiting': True,
    'log_all_messages': True
}

# URLs adicionales para APIs REST relacionadas con WebSockets
api_urlpatterns = [
    path('api/websocket/stats/', 'dashboard.api_views.websocket_stats', name='websocket_stats'),
    path('api/websocket/health/', 'dashboard.api_views.websocket_health', name='websocket_health'),
    path('api/websocket/connections/', 'dashboard.api_views.active_connections', name='active_connections'),
    path('api/websocket/broadcast/', 'dashboard.api_views.broadcast_message', name='broadcast_message'),
]
