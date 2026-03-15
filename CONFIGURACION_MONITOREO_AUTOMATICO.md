# Configuración de Monitoreo Automático - Sistema RBAC

Este documento explica cómo configurar el monitoreo automático del sistema de permisos.

## Comando de Verificación de Salud

El sistema incluye el comando `check_permisos_health` que verifica periódicamente:
- Roles sin permisos asignados
- Usuarios sin roles
- Asignaciones de roles expiradas
- Estado general del sistema

### Uso Básico

```bash
# Verificación simple
python manage.py check_permisos_health

# Con información detallada
python manage.py check_permisos_health --verbose

# Enviar reporte por email a administradores
python manage.py check_permisos_health --send-email

# Enviar a un email específico
python manage.py check_permisos_health --email admin@ejemplo.com

# Corregir automáticamente problemas detectados
python manage.py check_permisos_health --fix

# Combinación
python manage.py check_permisos_health --verbose --fix --send-email
```

### Códigos de Salida

El comando retorna códigos de salida apropiados para scripts de monitoreo:
- `0`: Sistema funcionando correctamente (OK)
- `1`: Advertencias detectadas (ADVERTENCIA)
- `2`: Problemas críticos detectados (CRITICO)

---

## Configuración en Linux/Unix (Cron)

### 1. Crear script wrapper

Crear archivo `/opt/cortesec/scripts/check_permisos.sh`:

```bash
#!/bin/bash

# Configuración
PROJECT_DIR="/opt/cortesec/backend"
PYTHON_ENV="/opt/cortesec/venv/bin/python"
LOG_FILE="/var/log/cortesec/permisos_health.log"

# Cambiar al directorio del proyecto
cd $PROJECT_DIR

# Ejecutar verificación
$PYTHON_ENV manage.py check_permisos_health --verbose --send-email >> $LOG_FILE 2>&1

# Capturar código de salida
EXIT_CODE=$?

# Registrar resultado
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Health check completed with exit code: $EXIT_CODE" >> $LOG_FILE

# Si hay problemas críticos, intentar corregir
if [ $EXIT_CODE -eq 2 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] CRITICO: Intentando corrección automática..." >> $LOG_FILE
    $PYTHON_ENV manage.py check_permisos_health --fix >> $LOG_FILE 2>&1
fi

exit $EXIT_CODE
```

Dar permisos de ejecución:

```bash
chmod +x /opt/cortesec/scripts/check_permisos.sh
```

### 2. Configurar Cron

Agregar a crontab (`crontab -e`):

```cron
# Verificar salud del sistema de permisos cada 6 horas
0 */6 * * * /opt/cortesec/scripts/check_permisos.sh

# Verificación diaria a las 8 AM con corrección automática
0 8 * * * /opt/cortesec/scripts/check_permisos.sh

# Verificación cada hora durante horario laboral (8 AM - 6 PM)
0 8-18 * * 1-5 /opt/cortesec/scripts/check_permisos.sh
```

### 3. Configurar Logrotate

Crear `/etc/logrotate.d/cortesec-permisos`:

```
/var/log/cortesec/permisos_health.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
}
```

---

## Configuración en Windows (Task Scheduler)

### 1. Crear script batch

Crear archivo `C:\CorteSec\scripts\check_permisos.bat`:

```batch
@echo off
REM Script de verificación de salud - Sistema RBAC

REM Configuración
set PROJECT_DIR=C:\Users\migue\Desktop\CorteSec\backend
set PYTHON_EXE=C:\Users\migue\AppData\Local\Programs\Python\Python312\python.exe
set LOG_FILE=C:\CorteSec\logs\permisos_health.log

REM Crear directorio de logs si no existe
if not exist "C:\CorteSec\logs" mkdir "C:\CorteSec\logs"

REM Cambiar al directorio del proyecto
cd /d %PROJECT_DIR%

REM Registrar inicio
echo [%date% %time%] Iniciando verificacion de salud... >> %LOG_FILE%

REM Ejecutar verificación
%PYTHON_EXE% manage.py check_permisos_health --verbose --send-email >> %LOG_FILE% 2>&1

REM Capturar código de salida
set EXIT_CODE=%ERRORLEVEL%

REM Registrar resultado
echo [%date% %time%] Verificacion completada con codigo: %EXIT_CODE% >> %LOG_FILE%

REM Si hay problemas críticos, intentar corregir
if %EXIT_CODE% equ 2 (
    echo [%date% %time%] CRITICO: Intentando correccion automatica... >> %LOG_FILE%
    %PYTHON_EXE% manage.py check_permisos_health --fix >> %LOG_FILE% 2>&1
)

exit /b %EXIT_CODE%
```

### 2. Configurar Task Scheduler

#### Opción A: Por línea de comandos (PowerShell como Administrador)

```powershell
# Tarea cada 6 horas
$action = New-ScheduledTaskAction -Execute "C:\CorteSec\scripts\check_permisos.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At "12:00 AM" -RepetitionInterval (New-TimeSpan -Hours 6) -RepetitionDuration (New-TimeSpan -Days 1)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "CorteSec - Check Permisos Health" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Verificación periódica de la salud del sistema de permisos RBAC"
```

#### Opción B: Por interfaz gráfica

1. Abrir Task Scheduler (Programador de tareas)
2. Crear tarea básica...
3. Nombre: `CorteSec - Check Permisos Health`
4. Desencadenador: Diaria, repetir cada 6 horas
5. Acción: Iniciar programa
   - Programa: `C:\CorteSec\scripts\check_permisos.bat`
6. Configuración avanzada:
   - Ejecutar con privilegios más altos
   - Ejecutar aunque el usuario no haya iniciado sesión
   - No iniciar si está en baterías (desactivar)

### 3. Verificar configuración

```powershell
# Ver tarea creada
Get-ScheduledTask -TaskName "*CorteSec*"

# Ver historial de ejecuciones
Get-ScheduledTaskInfo "CorteSec - Check Permisos Health"

# Ejecutar manualmente para probar
Start-ScheduledTask -TaskName "CorteSec - Check Permisos Health"
```

---

## Configuración de Email

### 1. Configurar emails en Django settings

En `settings.py`:

```python
# Email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # O tu servidor SMTP
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'tu-email@ejemplo.com'
EMAIL_HOST_PASSWORD = 'tu-contraseña-de-aplicación'
DEFAULT_FROM_EMAIL = 'Sistema RBAC <noreply@cortesec.com>'

# Administradores que recibirán emails
ADMINS = [
    ('Admin Principal', 'admin@cortesec.com'),
    ('DevOps', 'devops@cortesec.com'),
]
```

### 2. Para Gmail

1. Habilitar autenticación de 2 pasos
2. Generar contraseña de aplicación:
   - https://myaccount.google.com/apppasswords
3. Usar esa contraseña en `EMAIL_HOST_PASSWORD`

### 3. Probar envío de email

```bash
python manage.py check_permisos_health --email tu-email@ejemplo.com
```

---

## Monitoreo con Herramientas Externas

### 1. Integración con Nagios/Icinga

Crear `/usr/lib/nagios/plugins/check_cortesec_permisos`:

```bash
#!/bin/bash
cd /opt/cortesec/backend
/opt/cortesec/venv/bin/python manage.py check_permisos_health

EXIT_CODE=$?

case $EXIT_CODE in
    0)
        echo "OK - Sistema de permisos funcionando correctamente"
        exit 0
        ;;
    1)
        echo "WARNING - Se detectaron advertencias en el sistema de permisos"
        exit 1
        ;;
    2)
        echo "CRITICAL - Problemas críticos en el sistema de permisos"
        exit 2
        ;;
    *)
        echo "UNKNOWN - Error al ejecutar verificación"
        exit 3
        ;;
esac
```

### 2. Integración con Prometheus

El comando puede ser invocado por un exporter custom que exponga las métricas:

```python
# prometheus_exporter.py
from prometheus_client import start_http_server, Gauge
from dashboard.permisos_dashboard import get_permisos_dashboard_stats
import time

# Definir métricas
roles_total = Gauge('cortesec_roles_total', 'Total de roles en el sistema')
roles_sin_permisos = Gauge('cortesec_roles_sin_permisos', 'Roles sin permisos')
usuarios_sin_roles = Gauge('cortesec_usuarios_sin_roles', 'Usuarios sin roles')
asignaciones_expiradas = Gauge('cortesec_asignaciones_expiradas', 'Asignaciones expiradas')

def collect_metrics():
    """Recolectar métricas del sistema"""
    stats = get_permisos_dashboard_stats()
    resumen = stats['resumen']

    roles_total.set(resumen['roles_total'])
    roles_sin_permisos.set(resumen['roles_sin_permisos'])
    usuarios_sin_roles.set(resumen['usuarios_sin_roles'])
    asignaciones_expiradas.set(resumen['asignaciones_expiradas'])

if __name__ == '__main__':
    start_http_server(8001)
    while True:
        collect_metrics()
        time.sleep(60)  # Actualizar cada minuto
```

### 3. Integración con Datadog

```python
from datadog import initialize, statsd
from dashboard.permisos_dashboard import get_permisos_dashboard_stats

options = {
    'api_key': 'tu-api-key',
    'app_key': 'tu-app-key'
}

initialize(**options)

stats = get_permisos_dashboard_stats()
resumen = stats['resumen']

statsd.gauge('cortesec.roles.total', resumen['roles_total'])
statsd.gauge('cortesec.roles.sin_permisos', resumen['roles_sin_permisos'])
statsd.gauge('cortesec.usuarios.sin_roles', resumen['usuarios_sin_roles'])
statsd.gauge('cortesec.asignaciones.expiradas', resumen['asignaciones_expiradas'])
```

---

## Dashboard de Monitoreo

El sistema expone endpoints REST para visualización en tiempo real:

```
GET /api/dashboard/permisos/stats/          # Estadísticas completas
GET /api/dashboard/permisos/resumen/        # Resumen ejecutivo
GET /api/dashboard/permisos/alerts/         # Alertas actuales
```

Ejemplo de integración con frontend:

```javascript
// Consultar estado cada 5 minutos
setInterval(async () => {
    const response = await fetch('/api/dashboard/permisos/alerts/');
    const data = await response.json();

    if (data.alerts.length > 0) {
        showNotification({
            title: 'Alertas de Permisos',
            message: `${data.alerts.length} alertas detectadas`,
            type: 'warning'
        });
    }
}, 5 * 60 * 1000);
```

---

## Recomendaciones

### Frecuencia de Verificación

- **Producción**: Cada 6 horas con correo en caso de error
- **Staging**: Cada 12 horas
- **Desarrollo**: Diario a las 8 AM

### Acciones Automáticas

✅ **Recomendado**:
- Desactivar asignaciones expiradas (`--fix`)
- Enviar alertas por email
- Registrar en logs

❌ **NO Recomendado**:
- Asignar permisos automáticamente
- Crear o eliminar roles
- Modificar asignaciones vigentes

### Alertas

Configurar alertas inmediatas para:
1. Roles sin permisos (CRITICO)
2. >10% usuarios sin roles (ADVERTENCIA)
3. Asignaciones expiradas (CRITICO)

---

## Troubleshooting

### El comando no envía emails

1. Verificar configuración SMTP en `settings.py`
2. Probar conexión: `python manage.py shell`
   ```python
   from django.core.mail import send_mail
   send_mail('Test', 'Mensaje', 'from@ejemplo.com', ['to@ejemplo.com'])
   ```
3. Revisar logs de Django

### Task Scheduler no ejecuta el script

1. Verificar permisos del usuario
2. Ejecutar como SYSTEM o con privilegios elevados
3. Revisar historial de Task Scheduler
4. Ver logs en `C:\CorteSec\logs\permisos_health.log`

### Errores de importación

```bash
# Asegurar que el entorno virtual esté activado
source /opt/cortesec/venv/bin/activate  # Linux
venv\Scripts\activate  # Windows

# Verificar instalación de dependencias
pip install -r requirements.txt
```

---

## Mantenimiento

### Rotación de Logs

**Linux**: Configurar logrotate (ver arriba)

**Windows**: Crear script de limpieza

```batch
REM Limpiar logs antiguos (más de 30 días)
forfiles /p "C:\CorteSec\logs" /s /m *.log /d -30 /c "cmd /c del @path"
```

### Revisión Periódica

Cada mes, revisar:
1. Logs de ejecución
2. Historial de alertas
3. Eficacia de correcciones automáticas
4. Configuración de roles y permisos

---

**Última actualización**: 2026-02-13
**Versión**: 1.0.0
**Responsable**: Sistema CorteSec RBAC
