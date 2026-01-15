# 🚀 GUÍA DE DESPLIEGUE PROFESIONAL - CorteSec

## 📋 Tabla de Contenidos

1. [Comparativa de Proveedores VPS](#comparativa-vps)
2. [Arquitectura Recomendada](#arquitectura)
3. [Preparación del Proyecto](#preparacion)
4. [Configuración del Servidor](#servidor)
5. [Docker y Docker Compose](#docker)
6. [Base de Datos PostgreSQL](#postgresql)
7. [Nginx y SSL](#nginx)
8. [Variables de Entorno](#variables)
9. [CI/CD con GitHub Actions](#cicd)
10. [Monitoreo y Logs](#monitoreo)
11. [Backups Automatizados](#backups)
12. [Mantenimiento](#mantenimiento)

---

## 🏆 1. COMPARATIVA DE PROVEEDORES VPS {#comparativa-vps}

### 🥇 OPCIÓN 1: **DigitalOcean** (RECOMENDADO) ⭐⭐⭐⭐⭐

**Por qué es la mejor para CorteSec:**
- ✅ Interface extremadamente simple
- ✅ Droplets (VPS) desde $6/mes (1GB RAM, 25GB SSD)
- ✅ **Spaces** para almacenamiento de archivos (como S3)
- ✅ Documentación excelente
- ✅ Backups automáticos incluidos
- ✅ Snapshots gratuitos
- ✅ Firewall gratuito integrado
- ✅ Monitoreo básico incluido
- ✅ IPv6 sin costo
- ✅ **App Platform** para deploy automático (opcional)

**Planes Recomendados:**
```
🟢 DESARROLLO/STAGING:
   - Basic Droplet: $6/mes
   - 1 vCPU, 1GB RAM, 25GB SSD
   - 1TB transferencia
   - Perfecto para pruebas

🟡 PRODUCCIÓN PEQUEÑA (hasta 100 usuarios):
   - Basic Droplet: $18/mes
   - 2 vCPU, 2GB RAM, 50GB SSD
   - 2TB transferencia
   - Ideal para empezar

🔴 PRODUCCIÓN MEDIANA (hasta 500 usuarios):
   - Basic Droplet: $48/mes
   - 4 vCPU, 8GB RAM, 160GB SSD
   - 5TB transferencia
   - Escalable y robusto

🚀 PRODUCCIÓN GRANDE (1000+ usuarios):
   - Premium Droplet: $84/mes
   - 4 vCPU, 16GB RAM, 320GB SSD
   - 6TB transferencia
   - Alto rendimiento
```

**Servicios Adicionales:**
- **Managed PostgreSQL**: $15/mes (1GB RAM, 10GB SSD)
- **Spaces (S3)**: $5/mes (250GB almacenamiento)
- **Load Balancer**: $12/mes (para alta disponibilidad)

---

### 🥈 OPCIÓN 2: **Linode (Akamai)** ⭐⭐⭐⭐☆

**Ventajas:**
- ✅ Excelente rendimiento CPU
- ✅ Precio competitivo: $5/mes (1GB RAM)
- ✅ Soporte técnico 24/7 excepcional
- ✅ 11 data centers globales
- ✅ API potente para automatización

**Planes Recomendados:**
```
Desarrollo: $5/mes (1GB RAM)
Producción Pequeña: $12/mes (2GB RAM)
Producción Mediana: $24/mes (4GB RAM)
```

---

### 🥉 OPCIÓN 3: **Vultr** ⭐⭐⭐⭐☆

**Ventajas:**
- ✅ Pricing por hora (paga solo lo que usas)
- ✅ Desde $2.50/mes (512MB RAM)
- ✅ 25+ ubicaciones globales
- ✅ Snapshots gratuitos ilimitados

**Ideal para:** Proyectos con presupuesto muy ajustado

---

### 🏢 OPCIÓN 4: **AWS Lightsail** ⭐⭐⭐☆☆

**Ventajas:**
- ✅ Integración total con AWS
- ✅ Desde $5/mes (512MB RAM)
- ✅ Fácil migrar a EC2 después

**Desventajas:**
- ❌ Más complejo que DigitalOcean
- ❌ Pricing puede escalar rápido

---

### 🇨🇴 OPCIÓN 5: **Proveedores Locales Colombia**

#### **Axarnet Colombia** / **Hosting Colombia**
- ✅ Data center en Bogotá
- ✅ Soporte en español
- ✅ Facturación en pesos colombianos
- ❌ Más caro que internacionales
- ❌ Menos recursos/documentación

**Costo:** $50,000 - $150,000 COP/mes (similar a DigitalOcean)

---

## 🏗️ 2. ARQUITECTURA RECOMENDADA {#arquitectura}

### Arquitectura Profesional SaaS

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET / CLOUDFLARE                    │
│                    (DNS + DDoS Protection)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  NGINX REVERSE PROXY                        │
│                  (Port 80/443 - SSL)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Frontend   │  │   Backend    │  │    Static    │       │
│  │ (React/Vite) │  │   (Django)   │  │    Files     │       │
│  │ Port 3000    │  │  Port 8000   │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  PostgreSQL  │ │  Redis   │ │   Storage    │
│   Database   │ │  Cache   │ │  (S3/Spaces) │
│  Port 5432   │ │ Port 6379│ │              │
└──────────────┘ └──────────┘ └──────────────┘
```

### Stack de Tecnologías

```yaml
Servidor:
  - OS: Ubuntu 22.04 LTS
  - Web Server: Nginx 1.24+
  - WSGI Server: Gunicorn
  - Process Manager: Supervisor / systemd

Backend:
  - Python: 3.11+
  - Django: 4.2+
  - DRF: 3.14+
  - Database: PostgreSQL 15+
  - Cache: Redis 7+

Frontend:
  - Node.js: 18+ LTS
  - React: 18+
  - Vite: 5+
  - Build: Optimizado para producción

Seguridad:
  - SSL: Let's Encrypt (gratuito)
  - Firewall: UFW
  - Fail2ban: Protección contra ataques
  
Monitoreo:
  - Logs: Logrotate + Sentry
  - Uptime: UptimeRobot / Pingdom
  - Performance: New Relic / DataDog
```

---

## 📦 3. PREPARACIÓN DEL PROYECTO {#preparacion}

### Paso 3.1: Estructura Final del Proyecto

```
CorteSec/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-prod.txt
│   ├── gunicorn_config.py
│   ├── manage.py
│   └── contractor_management/
│       ├── settings/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── development.py
│       │   └── production.py
│       └── ...
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .env.production
└── scripts/
    ├── deploy.sh
    ├── backup.sh
    └── restore.sh
```

### Paso 3.2: Crear Settings de Producción

**Archivo: `backend/contractor_management/settings/base.py`**

```python
"""
Settings base compartidos entre desarrollo y producción
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

# ALLOWED_HOSTS se configura por ambiente
ALLOWED_HOSTS = []

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    
    # Local apps
    'core',
    'login',
    'nomina',
    'cargos',
    'prestamos',
    # ... más apps
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Para archivos estáticos
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.tenant.TenantMiddleware',
    'core.middleware.permissions.PermissionMiddleware',
]

# Database - se configura por ambiente

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}
```

**Archivo: `backend/contractor_management/settings/production.py`**

```python
"""
Settings de producción - SEGURIDAD MÁXIMA
"""
from .base import *
import os

DEBUG = False

# Dominios permitidos
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Database PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,  # Conexiones persistentes
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}

# Redis Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'CONNECTION_POOL_KWARGS': {'max_connections': 50}
        }
    }
}

# SEGURIDAD
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 año
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS para frontend
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')
CORS_ALLOW_CREDENTIALS = True

# Email en producción (ejemplo con SendGrid)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.sendgrid.net')
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL')

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs/django.log',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

# Sentry para monitoreo de errores (opcional pero ALTAMENTE recomendado)
if os.environ.get('SENTRY_DSN'):
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment='production',
    )
```

### Paso 3.3: Crear `requirements-prod.txt`

```txt
# Producción - Optimizado y seguro
Django==4.2.7
djangorestframework==3.14.0
django-cors-headers==4.3.1
django-filter==23.5
psycopg2-binary==2.9.9
gunicorn==21.2.0
whitenoise==6.6.0
django-redis==5.4.0
redis==5.0.1
celery==5.3.4
python-dotenv==1.0.0
Pillow==10.1.0

# Seguridad
django-ratelimit==4.1.0
django-axes==6.1.1

# Monitoreo (opcional)
sentry-sdk==1.38.0
newrelic==9.4.0

# Almacenamiento en la nube (si usas S3/Spaces)
boto3==1.34.10
django-storages==1.14.2
```

### Paso 3.4: Configurar Gunicorn

**Archivo: `backend/gunicorn_config.py`**

```python
"""
Configuración de Gunicorn para producción
"""
import multiprocessing

# Bind
bind = "0.0.0.0:8000"

# Workers
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 5

# Logging
accesslog = "-"  # STDOUT
errorlog = "-"   # STDERR
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "cortesec_gunicorn"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (si terminas SSL en Gunicorn en lugar de Nginx)
# keyfile = "/path/to/key.pem"
# certfile = "/path/to/cert.pem"
```

---

## 🐳 4. DOCKER Y DOCKER COMPOSE {#docker}

### Paso 4.1: Dockerfile Backend

**Archivo: `backend/Dockerfile`**

```dockerfile
# Multi-stage build para optimizar tamaño
FROM python:3.11-slim as builder

# Variables de entorno
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root
RUN useradd -m -u 1000 appuser

# Directorio de trabajo
WORKDIR /app

# Copiar requirements
COPY requirements-prod.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements-prod.txt

# Stage final
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

# Instalar solo runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario
RUN useradd -m -u 1000 appuser

# Copiar dependencias desde builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Directorio de trabajo
WORKDIR /app

# Copiar código
COPY --chown=appuser:appuser . .

# Crear directorios necesarios
RUN mkdir -p /app/staticfiles /app/media /app/logs && \
    chown -R appuser:appuser /app

# Cambiar a usuario no-root
USER appuser

# Recolectar archivos estáticos
RUN python manage.py collectstatic --no-input --settings=contractor_management.settings.production || true

# Exponer puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/health/')"

# Comando de inicio
CMD ["gunicorn", "contractor_management.wsgi:application", "-c", "gunicorn_config.py"]
```

### Paso 4.2: Dockerfile Frontend

**Archivo: `frontend/Dockerfile`**

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Build para producción
RUN npm run build

# Production stage con Nginx
FROM nginx:alpine

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Comando
CMD ["nginx", "-g", "daemon off;"]
```

### Paso 4.3: Nginx para Frontend

**Archivo: `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router - SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Paso 4.4: Docker Compose Producción

**Archivo: `docker-compose.prod.yml`**

```yaml
version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: cortesec_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - cortesec_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: cortesec_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - cortesec_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Backend Django
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cortesec_backend
    restart: unless-stopped
    env_file:
      - .env.production
    environment:
      - DJANGO_SETTINGS_MODULE=contractor_management.settings.production
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
      - ./backend/logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - cortesec_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend React
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cortesec_frontend
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - cortesec_network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: cortesec_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - static_volume:/static:ro
      - media_volume:/media:ro
    depends_on:
      - backend
      - frontend
    networks:
      - cortesec_network
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Certbot para SSL
  certbot:
    image: certbot/certbot
    container_name: cortesec_certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  static_volume:
    driver: local
  media_volume:
    driver: local

networks:
  cortesec_network:
    driver: bridge
```

---

## 🔐 5. VARIABLES DE ENTORNO {#variables}

**Archivo: `.env.production`**

```bash
# Django
DJANGO_SECRET_KEY=tu-clave-secreta-super-larga-y-aleatoria-minimo-50-caracteres
DJANGO_SETTINGS_MODULE=contractor_management.settings.production
DEBUG=False
ALLOWED_HOSTS=tudominio.com,www.tudominio.com,api.tudominio.com

# Database
DB_NAME=cortesec_production
DB_USER=cortesec_user
DB_PASSWORD=password-super-seguro-cambiar-esto
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_URL=redis://:redis-password-seguro@redis:6379/1
REDIS_PASSWORD=redis-password-seguro

# CORS
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com

# Email (ejemplo SendGrid)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=tu-api-key-de-sendgrid
DEFAULT_FROM_EMAIL=noreply@tudominio.com

# AWS S3 / DigitalOcean Spaces (opcional)
USE_S3=True
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_STORAGE_BUCKET_NAME=cortesec-media
AWS_S3_REGION_NAME=nyc3
AWS_S3_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com

# Sentry (monitoreo de errores)
SENTRY_DSN=https://tu-sentry-dsn@sentry.io/proyecto

# Backups
BACKUP_RETENTION_DAYS=30
```

---

## 🚀 6. SCRIPT DE DEPLOY AUTOMÁTICO {#scripts}

**Archivo: `scripts/deploy.sh`**

```bash
#!/bin/bash

# 🚀 Script de Deploy Profesional - CorteSec
# Autor: Sistema CorteSec
# Versión: 1.0.0

set -e  # Salir si hay errores

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    🚀 CorteSec Deploy Automático 🚀     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Variables
DEPLOY_USER="cortesec"
DEPLOY_DIR="/home/cortesec/app"
BACKUP_DIR="/home/cortesec/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Funciones
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Verificar prerequisitos
log_info "Verificando prerequisitos..."
command -v docker >/dev/null 2>&1 || { log_error "Docker no está instalado. Abortando."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose no está instalado. Abortando."; exit 1; }

# 2. Crear backup antes de deploy
log_info "Creando backup de seguridad..."
mkdir -p $BACKUP_DIR/$TIMESTAMP
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/$TIMESTAMP/database.sql
log_info "Backup creado en: $BACKUP_DIR/$TIMESTAMP"

# 3. Pull código desde Git
log_info "Obteniendo última versión del código..."
git fetch origin
git reset --hard origin/main

# 4. Construir imágenes Docker
log_info "Construyendo imágenes Docker..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Ejecutar migraciones
log_info "Ejecutando migraciones de base de datos..."
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py migrate --no-input

# 6. Recolectar archivos estáticos
log_info "Recolectando archivos estáticos..."
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --no-input

# 7. Reiniciar servicios
log_info "Reiniciando servicios..."
docker-compose -f docker-compose.prod.yml up -d --remove-orphans

# 8. Verificar salud de servicios
log_info "Verificando salud de servicios..."
sleep 10
docker-compose -f docker-compose.prod.yml ps

# 9. Limpiar imágenes antiguas
log_info "Limpiando imágenes antiguas..."
docker image prune -f

# 10. Resumen
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Deploy Completado Exitosamente     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
log_info "Backup guardado en: $BACKUP_DIR/$TIMESTAMP"
log_info "Logs disponibles: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
```

---

## 📊 7. MONITOREO Y LOGS {#monitoreo}

### Configurar Sentry (Gratis hasta 5,000 errores/mes)

```bash
# 1. Crear cuenta en https://sentry.io
# 2. Crear nuevo proyecto Django
# 3. Copiar DSN
# 4. Agregar a .env.production:
SENTRY_DSN=https://xxxx@sentry.io/xxxx
```

### UptimeRobot (Monitoreo 24/7 Gratis)

```
1. Ir a https://uptimerobot.com
2. Crear monitor HTTP(S)
3. URL: https://tudominio.com/api/health/
4. Intervalo: 5 minutos
5. Alertas: Email + Telegram
```

### Ver Logs en Tiempo Real

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Solo backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Solo errores
docker-compose -f docker-compose.prod.yml logs -f | grep ERROR

# Últimas 100 líneas
docker-compose -f docker-compose.prod.yml logs --tail=100
```

---

## 💾 8. BACKUPS AUTOMATIZADOS {#backups}

**Archivo: `scripts/backup.sh`**

```bash
#!/bin/bash

# Configuración
BACKUP_DIR="/home/cortesec/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Crear directorio
mkdir -p $BACKUP_DIR/$TIMESTAMP

# Backup PostgreSQL
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/$TIMESTAMP/database.sql.gz

# Backup archivos media
tar -czf $BACKUP_DIR/$TIMESTAMP/media.tar.gz ./media/

# Subir a S3/Spaces (opcional)
# s3cmd put $BACKUP_DIR/$TIMESTAMP/*.gz s3://backups-cortesec/

# Limpiar backups antiguos
find $BACKUP_DIR -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;

echo "Backup completado: $BACKUP_DIR/$TIMESTAMP"
```

**Configurar Cron para backups diarios:**

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 2 AM)
0 2 * * * /home/cortesec/app/scripts/backup.sh >> /home/cortesec/logs/backup.log 2>&1
```

---

## ⚡ 9. COMANDOS ÚTILES {#comandos}

### Deploy y Mantenimiento

```bash
# Deploy inicial
./scripts/deploy.sh

# Reiniciar solo un servicio
docker-compose -f docker-compose.prod.yml restart backend

# Ver estado
docker-compose -f docker-compose.prod.yml ps

# Acceder a shell de Django
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell

# Crear superusuario
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Ver uso de recursos
docker stats

# Limpiar sistema
docker system prune -a --volumes
```

### Base de Datos

```bash
# Conectar a PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U cortesec_user cortesec_production

# Backup manual
./scripts/backup.sh

# Restaurar backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $DB_USER $DB_NAME < backup.sql
```

---

## 🎯 10. CHECKLIST DE DEPLOY {#checklist}

### Antes del Deploy

- [ ] Cambiar todas las contraseñas/secrets
- [ ] Configurar DNS apuntando a tu VPS
- [ ] Comprar dominio (si no tienes)
- [ ] Configurar email (SendGrid/Mailgun)
- [ ] Crear cuenta Sentry
- [ ] Configurar variables de entorno
- [ ] Probar en staging primero

### Durante el Deploy

- [ ] Clonar repositorio
- [ ] Configurar .env.production
- [ ] Construir imágenes Docker
- [ ] Iniciar servicios
- [ ] Configurar SSL con Let's Encrypt
- [ ] Verificar todos los servicios corriendo
- [ ] Probar endpoints críticos

### Después del Deploy

- [ ] Configurar backups automáticos
- [ ] Configurar monitoreo (UptimeRobot)
- [ ] Configurar alertas
- [ ] Documentar credenciales (en lugar seguro)
- [ ] Probar flujos completos
- [ ] Configurar firewall
- [ ] Hardening del servidor

---

## 💰 11. COSTOS ESTIMADOS MENSUALES

### Opción 1: DigitalOcean (RECOMENDADO)

```
🟢 Startup (hasta 50 usuarios):
- Droplet 2GB: $18/mes
- Managed PostgreSQL 1GB: $15/mes
- Spaces 250GB: $5/mes
- Backups: $3/mes
- Total: ~$41/mes

🟡 Crecimiento (hasta 200 usuarios):
- Droplet 4GB: $48/mes
- Managed PostgreSQL 2GB: $30/mes
- Spaces 500GB: $5/mes
- Load Balancer: $12/mes
- Backups: $7/mes
- Total: ~$102/mes

🔴 Escalado (500+ usuarios):
- Droplet 8GB: $84/mes
- Managed PostgreSQL 4GB: $60/mes
- Spaces 1TB: $5/mes
- Load Balancer: $12/mes
- Redis Managed: $15/mes
- Backups: $12/mes
- Total: ~$188/mes
```

### Servicios Adicionales (Opcionales)

```
- Sentry: Gratis (hasta 5k errores/mes)
- UptimeRobot: Gratis (50 monitores)
- Cloudflare: Gratis (DNS + CDN + DDoS)
- SendGrid: Gratis (100 emails/día)
- Total Adicional: $0/mes 🎉
```

---

## 🎓 12. RECURSOS DE APRENDIZAJE

### Documentación Oficial
- [DigitalOcean Docs](https://docs.digitalocean.com/)
- [Docker Docs](https://docs.docker.com/)
- [Nginx Docs](https://nginx.org/en/docs/)
- [Django Deployment](https://docs.djangoproject.com/en/4.2/howto/deployment/)

### Tutoriales Recomendados
- [Django Production Best Practices](https://testdriven.io/blog/django-best-practices/)
- [Docker for Django](https://testdriven.io/blog/dockerizing-django-with-postgres-gunicorn-and-nginx/)
- [Let's Encrypt SSL](https://certbot.eff.org/)

---

## 📞 13. SOPORTE Y SIGUIENTES PASOS

### Próximos Pasos Después del Deploy

1. **Configurar CI/CD** con GitHub Actions
2. **Implementar Celery** para tareas asíncronas
3. **Configurar CDN** con Cloudflare
4. **Implementar Elasticsearch** para búsqueda avanzada
5. **Configurar WebSockets** para tiempo real
6. **Implementar rate limiting** con Redis
7. **Configurar monitoring avanzado** con Grafana

### ¿Necesitas Ayuda?

Si necesitas ayuda con algún paso específico, pregúntame y te ayudaré con más detalles sobre:

- Configuración específica de Nginx
- Setup de CI/CD con GitHub Actions
- Optimización de performance
- Configuración de Cloudflare
- Implementación de Celery
- Migración de datos
- Troubleshooting

---

**🎉 ¡Felicitaciones! Ahora tienes una guía completa para desplegar CorteSec profesionalmente.**

**Próximo documento recomendado:** `GUIA_GITHUB_ACTIONS_CICD.md` para automatizar completamente el deploy.
