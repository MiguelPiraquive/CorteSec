from pathlib import Path
import os
import dj_database_url
from django.urls import reverse_lazy

BASE_DIR = Path(__file__).resolve().parent.parent

# Detectar si estamos en producción
DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = [
    'cortesec.onrender.com',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'testserver',  # Para tests
]

# Configuración de clave secreta más segura
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-key-only-for-development-cortesec-2024'
    else:
        raise ValueError("SECRET_KEY must be set in production environment")

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
    'django_filters',
    # Apps del proyecto - Core
    'core',
    'login',
    'dashboard',
    # Apps del proyecto - Gestión empresarial
    'perfil',
    'payroll',  # Nómina (incluye empleados)
    'prestamos',
    'cargos',
    'roles',
    'permisos',
    # Apps del proyecto - Recursos y configuración
    'items',
    'tipos_cantidad',
    'locations',
    'configuracion',
    # Apps del proyecto - Contabilidad
    'contabilidad',
    # Apps del proyecto - Reportes
    'reportes',
    # Apps del proyecto - Soporte y documentación
    'ayuda',
    'documentacion',
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
    'core.middleware.permissions.PermissionMiddleware',     # Control de permisos
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.locale.LocaleMiddleware',
]

# ============================================
# CONFIGURACIÓN CORS - SECCIÓN ÚNICA
# ============================================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
    "http://localhost:5174",  # Vite alternate port
    "http://127.0.0.1:5174",
    "https://cortesec-frontend.netlify.app",
]

CORS_ALLOW_CREDENTIALS = True

# FORZAR USO DE HEADERS ESPECÍFICOS (no usar CORS_ALLOW_ALL_ORIGINS)
CORS_ALLOW_ALL_ORIGINS = False  # Deshabilitado para usar CORS_ALLOWED_HEADERS específicos

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
        'NAME': 'postgres',
        'USER': 'postgres',
        'PASSWORD': '12345',
        'HOST': 'localhost',
        'PORT': '5432',
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
# CONFIGURACIÓN EMAIL
# ============================================
DEBUG_EMAIL = os.environ.get('DEBUG_EMAIL', 'True').lower() == 'true'

if DEBUG_EMAIL:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_HOST_USER', 'CorteSec <no-reply@cortesec.com>')

# Frontend URL configuration
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
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = 3600  # 1 hora
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = True

X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# Configuración HTTPS
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ============================================
# CONFIGURACIÓN CACHE - SECCIÓN ÚNICA
# ============================================
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
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '50/hour',
        'user': '500/hour',
        'login': '5/min',
    },
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
    'DATE_FORMAT': '%Y-%m-%d',
    'TIME_FORMAT': '%H:%M:%S',
}

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
TOKEN_EXPIRE_HOURS = 24
SITE_NAME = 'CorteSec'
