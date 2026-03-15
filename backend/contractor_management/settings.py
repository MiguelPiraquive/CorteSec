from pathlib import Path
from datetime import timedelta
import os
import dj_database_url
from django.urls import reverse_lazy
from decouple import config


BASE_DIR = Path(__file__).resolve().parent.parent

# DEBUG: False por defecto (seguro). En desarrollo, set DEBUG=True en .env
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# ALLOWED_HOSTS: producción solo hosts reales, desarrollo incluye localhost
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',') if os.environ.get('ALLOWED_HOSTS') else [
    'cortesec.onrender.com',
]
if DEBUG:
    ALLOWED_HOSTS += ['localhost', '127.0.0.1', 'testserver']

# SECRET_KEY: obligatoria siempre, sin fallback inseguro
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY environment variable is required. "
        "Generate one with: python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\""
    )

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    # Third party apps
    'corsheaders',
    'django_select2',
    'widget_tweaks',
    # Django REST Framework
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'drf_spectacular',  # OpenAPI 3.0 schema generation
    # Apps del proyecto - Core
    'core',
    'login',
    'dashboard',
    # Apps del proyecto - Gestión empresarial
    'perfil',
    'nomina',  # Sistema de Nómina - Empleados, Contratos, Nóminas
    'prestamos',
    'cargos',
    'roles',  # Módulo de roles
    'permisos',  # Módulo de permisos
    # Apps del proyecto - Recursos y configuración
    'items',
    'tipos_cantidad',
    'locations',
    'configuracion',
    'usuarios',
    # Apps del proyecto - Contabilidad
    'contabilidad',
    # Apps del proyecto - Soporte y documentación
    'ayuda',
    'documentacion',
    # Apps del proyecto - Billing
    'billing',
]

# Filtrar valores None de INSTALLED_APPS
INSTALLED_APPS = [app for app in INSTALLED_APPS if app is not None]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # Middleware de sesión dinámica (lee tiempo_sesion de ConfiguracionSeguridad)
    'core.middleware.security_config.DynamicSessionTimeoutMiddleware',
    # Middleware Multi-Tenant
    'core.middleware.tenant.TenantMiddleware',           # Detección de organización
    'core.middleware.tenant.TenantRequiredMiddleware',   # Validación de tenant
    # Middleware de seguridad personalizado
    'login.middleware.SecurityHeadersMiddleware',    # Headers de seguridad
    # 'login.middleware.TokenValidationMiddleware',    # Temporalmente deshabilitado
    'login.middleware.RateLimitingMiddleware',       # Rate limiting básico
    'core.middleware.api_security.APISecurityMiddleware',  # Validación API específica
    # Middleware del sistema de permisos
    'core.middleware.permissions.SecurityAuditMiddleware',  # Auditoría de seguridad
    'core.middleware.permissions.AuditMiddleware',          # Auditoría de acciones CRUD
    'core.middleware.permissions.PermissionMiddleware',     # Control de permisos
    # Middleware de verificación de roles
    # 'core.middleware.role_verification.RoleVerificationMiddleware',  # Deshabilitado: cumple_atributos ahora se verifica en policies
    # Middleware de enforcement de suscripción/billing
    'billing.middleware.SubscriptionEnforcementMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.locale.LocaleMiddleware',
]

# ============================================
# CONFIGURACIÓN CORS - SECCIÓN ÚNICA
# ============================================
# Producción: solo orígenes explícitos
CORS_ALLOWED_ORIGINS = [
    "https://cortesec-frontend.netlify.app",
]
# Desarrollo: agregar localhost
if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

CORS_ALLOW_CREDENTIALS = True

# FORZAR USO DE HEADERS ESPECÍFICOS (no usar CORS_ALLOW_ALL_ORIGINS)
CORS_ALLOW_ALL_ORIGINS = False

# ============================================
# CSRF TRUSTED ORIGINS
# ============================================
CSRF_TRUSTED_ORIGINS = [
    "https://cortesec-frontend.netlify.app",
    "https://cortesec.onrender.com",
]
if DEBUG:
    CSRF_TRUSTED_ORIGINS += [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

# Configuraciones adicionales para resolver problemas de cache
CORS_PREFLIGHT_MAX_AGE = 86400
CORS_ALLOW_HEADERS = [  # ✅ NOMBRE CORRECTO (no CORS_ALLOWED_HEADERS)
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-tenant-codigo',  # Header multitenant (minúsculas)
    'X-Tenant-Codigo',  # Header multitenant (PascalCase)
    'x-tenant-slug',    # Alternativo para tenant
    'X-Tenant-Slug',    # Alternativo para tenant (PascalCase)
]

CORS_EXPOSE_HEADERS = [
    'content-disposition',
]

# ============================================
# CONFIGURACIÓN DJANGO CORE
# ============================================
ROOT_URLCONF = 'contractor_management.urls'
AUTH_USER_MODEL = 'login.CustomUser'

# ============================================
# CONFIGURACIÓN SAAS (PLANES / TRIAL)
# ============================================
CORE_DEFAULT_PLAN_CODE = os.environ.get('CORE_DEFAULT_PLAN_CODE', 'FREE')
CORE_TRIAL_DAYS = int(os.environ.get('CORE_TRIAL_DAYS', '14'))

# ============================================
# FIXER.IO - TASAS DE CAMBIO
# ============================================
FIXER_API_KEY = config("FIXER_API_KEY", default="")


LOGIN_URL = '/api/auth/login/'
LOGIN_REDIRECT_URL = '/api/dashboard/'
LOGOUT_REDIRECT_URL = '/api/auth/login/'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'contractor_management.wsgi.application'

# ============================================
# CONFIGURACIÓN BASE DE DATOS
# ============================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'postgres'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# ============================================
# VALIDADORES DE CONTRASEÑA
# ============================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
    # Validadores personalizados de seguridad
    {'NAME': 'login.password_validators.PasswordComplexityValidator',},
    {'NAME': 'login.password_validators.PasswordHistoryValidator',},
    {'NAME': 'login.password_validators.PasswordExpiryValidator',},
]

# ============================================
# PASSWORD HASHERS (bcrypt preferred)
# ============================================
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]

# ============================================
# INTERNACIONALIZACIÓN
# ============================================
LANGUAGE_CODE = 'es'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

LANGUAGES = [
    ('es', 'Español'),
    ('en', 'English'),
]

LOCALE_PATHS = [BASE_DIR / 'locale']

# ============================================
# ARCHIVOS ESTÁTICOS Y MEDIA
# ============================================
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
STATICFILES_DIRS = [BASE_DIR / "static"]

WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================
# CONFIGURACIÓN EMAIL SMTP
# ============================================

# Modo debug (True = emails en consola, False = envío real SMTP)
DEBUG_EMAIL = os.environ.get('DEBUG_EMAIL', 'True').lower() == 'true'

if DEBUG_EMAIL:
    # Modo desarrollo: emails en consola del backend
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    print("[EMAIL] MODE: Console (Development) - Emails se mostraran en la consola")
else:
    # Modo producción: envío real por SMTP
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    print("[EMAIL] MODE: SMTP (Production) - Emails se enviaran por Gmail")

# Configuración SMTP (Gmail)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')  # App Password de Gmail
EMAIL_TIMEOUT = 30  # Timeout en segundos

# Remitente por defecto
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_HOST_USER') or 'CorteSec <no-reply@cortesec.com>'

# Frontend URL para enlaces en emails
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# ============================================
# CONFIGURACIONES DE SEGURIDAD - SECCIÓN ÚNICA
# ============================================
if not DEBUG:
    # Configuraciones de seguridad para producción
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
else:
    # En desarrollo, usar configuraciones menos estrictas pero seguras
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_SSL_REDIRECT = False

# Configuraciones de seguridad para todas las env
SESSION_COOKIE_HTTPONLY = True
# CSRF cookie must NOT be httpOnly so the frontend JS can read it and
# send the X-CSRFToken header (double-submit cookie pattern).
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 3600  # Fallback 1 hora — en runtime se sobreescribe por DynamicSessionTimeoutMiddleware
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = True

X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# Configuración HTTPS
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ============================================
# PASSWORD RESET TIMEOUT
# ============================================
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour

# ============================================
# FILE UPLOAD LIMITS
# ============================================
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000

# ============================================
# CONFIGURACIÓN CACHE - SECCIÓN ÚNICA
# ============================================
REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
            'TIMEOUT': 300,
            'OPTIONS': {
                'db': 1,
            }
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
            'TIMEOUT': 300,
            'OPTIONS': {
                'MAX_ENTRIES': 1000,
                'CULL_FREQUENCY': 3,
            }
        }
    }

# ============================================
# DJANGO REST FRAMEWORK
# ============================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'login.cookie_auth.CookieJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ] + (['rest_framework.renderers.BrowsableAPIRenderer'] if DEBUG else []),
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '500/hour' if not DEBUG else '10000/hour',
        'login': '5/min' if not DEBUG else '10/min',
    },
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
    'DATE_FORMAT': '%Y-%m-%d',
    'TIME_FORMAT': '%H:%M:%S',
    # Schema generation for API documentation
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ============================================
# DRF SPECTACULAR - API DOCUMENTATION
# ============================================
SPECTACULAR_SETTINGS = {
    'TITLE': 'CorteSec API',
    'DESCRIPTION': '''
    API completa para el sistema de gestión empresarial CorteSec.
    
    Esta API proporciona endpoints para:
    - 🔐 Autenticación y autorización
    - 👥 Gestión de usuarios y perfiles
    - 🏢 Gestión de organizaciones (multi-tenant)
    - 💼 Nómina y empleados
    - 📊 Dashboard y métricas
    - 🎯 Cargos y roles
    - 📍 Ubicaciones (departamentos/municipios)
    - 💰 Préstamos y contabilidad
    - ⚙️ Configuración del sistema
    - 📋 Items y tipos de cantidad
    - 🆘 Sistema de ayuda
    
    ## Autenticación
    La API utiliza JWT Authentication. Incluye el access token en el header:
    ```
    Authorization: Bearer your_access_token_here
    ```
    
    ## Multi-tenant
    El sistema soporta múltiples organizaciones. Muchos endpoints 
    filtran datos automáticamente según la organización del usuario.
    ''',
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': True,
    'ENABLE_DJANGO_DEPLOY_CHECK': True,
    'DISABLE_ERRORS_AND_WARNINGS': False,
    
    # Configuración de la interfaz Swagger UI  
    # 'SWAGGER_UI_DIST': Usar por defecto (CDN)
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
        'defaultModelExpandDepth': 2,
        'defaultModelsExpandDepth': 2,
        'displayRequestDuration': True,
        'docExpansion': 'none',
        'filter': True,
        'showExtensions': True,
        'showCommonExtensions': True,
        'tryItOutEnabled': True,
    },
    
    # Configuración de ReDoc
    # 'REDOC_DIST': Usar por defecto (CDN)  
    'REDOC_UI_SETTINGS': {
        'nativeScrollbars': True,
        'theme': {
            'colors': {
                'primary': {
                    'main': '#1976d2'
                }
            },
            'typography': {
                'fontSize': '14px',
                'lineHeight': '1.5em',
                'code': {
                    'fontSize': '13px',
                },
                'headings': {
                    'fontFamily': 'Roboto, sans-serif',
                }
            }
        }
    },
    
    # Configuración del schema
    'SCHEMA_PATH_PREFIX': r'/api/',
    'DEFAULT_GENERATOR_CLASS': 'drf_spectacular.generators.SchemaGenerator',
    'SERVE_PERMISSIONS': ['rest_framework.permissions.AllowAny'] if DEBUG else ['rest_framework.permissions.IsAdminUser'],
    'SERVE_AUTHENTICATION': [] if DEBUG else None,  # Usar autenticación por defecto en producción
    'SERVERS': [
        {
            'url': 'http://localhost:8000',
            'description': 'Development server'
        },
        {
            'url': 'https://cortesec.onrender.com',
            'description': 'Production server'
        },
        
    ],
    
    # Configuración de autenticación en la documentación
    'AUTHENTICATION_WHITELIST': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    
    # Etiquetas para organizar endpoints
    'TAGS': [
        {'name': 'Auth', 'description': 'Autenticación y autorización'},
        {'name': 'Users', 'description': 'Gestión de usuarios y perfiles'},
        {'name': 'Organizations', 'description': 'Gestión de organizaciones'},
        {'name': 'Dashboard', 'description': 'Dashboard y métricas'},
        {'name': 'Payroll', 'description': 'Nómina y empleados'},
        {'name': 'Cargos', 'description': 'Cargos y posiciones'},
        {'name': 'Locations', 'description': 'Departamentos y municipios'},
        {'name': 'Loans', 'description': 'Préstamos'},
        {'name': 'Accounting', 'description': 'Contabilidad'},
        {'name': 'Configuration', 'description': 'Configuración del sistema'},
        {'name': 'Items', 'description': 'Items y inventario'},
        {'name': 'Help', 'description': 'Sistema de ayuda'},
        {'name': 'Core', 'description': 'Funcionalidades base del sistema'},
    ],
    
    # Excluir paths específicos si es necesario
    'EXCLUDE_PATH_FORMAT': [
        '/api/admin/',
        '/api/internal/',
    ],
}

# ============================================
# MULTI-TENANT CONFIGURATION
# ============================================

# Rutas que están exentas de requerir tenant
TENANT_EXEMPT_PATHS = [
    '/api/auth/login/',
    '/api/auth/register/',
    '/api/auth/verify-email/',
    '/api/auth/password-reset/',
    '/api/auth/password-reset/confirm/',
    '/api/auth/token/refresh/',  # JWT refresh no requiere tenant
    '/api/invitacion/validar/',  # Validar invitación (público)
    '/api/invitacion/aceptar/',  # Aceptar invitación (público)
    '/api/organizations/',  # Permitir a organizaciones sin tenant
    '/api/plans/',           # Planes SaaS (staff/admin)
    '/api/plan-changes/',    # Historial de planes
    '/api/public/',          # APIs públicas (landing)
    '/admin/',
    '/static/',
    '/media/',
    # API Documentation paths
    '/api/schema/',         # OpenAPI schema
    '/api/docs/',          # Swagger UI
    '/api/redoc/',         # ReDoc UI
]

# Rutas que requieren tenant obligatorio
TENANT_REQUIRED_PATHS = [
    '/api/',
    '/dashboard/',
]

# ============================================
# SISTEMA DE PERMISOS
# ============================================
PERMISOS_CONFIG = {
    'CACHE_TIMEOUT': 300,
    'ENABLE_AUDIT': True,
    'ENABLE_CONDITIONS': True,
    'ENABLE_HIERARCHY': True,
    'ENABLE_MULTI_TENANT': True,
    'MAX_HIERARCHY_DEPTH': 10,
    'DEFAULT_ORGANIZATION': 'default',
    'CONDITION_TIMEOUT': 30,
    'BULK_OPERATIONS_LIMIT': 1000,
}

# ============================================
# CONFIGURACIONES DE SEGURIDAD AVANZADA
# ============================================
TWO_FACTOR_AUTH = {
    'ENABLED': True,
    'METHODS': ['totp', 'email', 'sms'],
    'DEFAULT_METHOD': 'email',
    'TOKEN_EXPIRY_MINUTES': 5,
    'BACKUP_CODES_COUNT': 10,
    'TRUSTED_DEVICE_DAYS': 30,
    'REQUIRE_2FA_FOR_ADMIN': True,
}

AUTH_SECURITY = {
    'MAX_LOGIN_ATTEMPTS': 5,
    'LOCKOUT_DURATION_MINUTES': 15,
    'RATE_LIMIT_ENABLED': True,
    'IP_WHITELIST': [],
    'TRACK_LOGIN_ATTEMPTS': True,
    'REQUIRE_STRONG_PASSWORDS': True,
}

# ============================================
# CONFIGURACIÓN LOGGING - SECCIÓN ÚNICA
# ============================================
LOGGING_CONFIG = None
import logging.config

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'security': {
            'format': '{asctime} [SECURITY] {levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'django-error.log',
            'formatter': 'verbose',
        },
        'security_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'security.log',
            'formatter': 'security',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.security': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'security': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'login': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'contractor_management': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# ============================================
# CONFIGURACIONES ADICIONALES
# ============================================
SECURITY_AUDIT_ENABLED = True

# ============================================
# JWT CONFIGURATION (SimpleJWT)
# ============================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',

    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'TOKEN_OBTAIN_SERIALIZER': 'login.jwt_serializers.CustomTokenObtainPairSerializer',
}

# ============================================
# CELERY CONFIGURATION
# ============================================
from celery.schedules import crontab

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Bogota'

# Configuración de tareas programadas (Celery Beat)
CELERY_BEAT_SCHEDULE = {
    # ===== TAREAS DE NÓMINA =====
    # Por ahora el sistema de nómina es manual (sin Celery)

    # ===== TAREAS DE BILLING =====
    # Verificar suscripciones y trials cada día a las 8 AM
    'check-subscriptions-diario': {
        'task': 'billing.tasks.check_subscriptions_daily',
        'schedule': crontab(hour=8, minute=0),
    },
    # Limpiar datos expirados cada domingo a las 3 AM
    'cleanup-expired-data-semanal': {
        'task': 'billing.tasks.cleanup_expired_data',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),
    },
}

SITE_NAME = 'CorteSec'

# ============================================
# STRIPE / BILLING
# ============================================
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
BILLING_GATEWAY = os.environ.get('BILLING_GATEWAY', 'wompi')  # 'stripe', 'wompi' o 'manual'

# ============================================
# WOMPI (Pasarela de pago Colombia)
# ============================================
WOMPI_PUBLIC_KEY = os.environ.get('WOMPI_PUBLIC_KEY', '')
WOMPI_PRIVATE_KEY = os.environ.get('WOMPI_PRIVATE_KEY', '')
WOMPI_EVENTS_SECRET = os.environ.get('WOMPI_EVENTS_SECRET', '')
WOMPI_INTEGRITY_SECRET = os.environ.get('WOMPI_INTEGRITY_SECRET', '')
WOMPI_SANDBOX = os.environ.get('WOMPI_SANDBOX', 'true').lower() in ('true', '1', 'yes')
