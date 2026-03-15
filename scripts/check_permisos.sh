#!/bin/bash
# =============================================================================
# Script de Verificación de Salud - Sistema RBAC CorteSec
# =============================================================================
#
# Este script ejecuta la verificación periódica del sistema de permisos
# y registra los resultados en un archivo de log.
#
# Uso:
#   ./check_permisos.sh              - Verificación simple
#   ./check_permisos.sh --fix        - Con corrección automática
#   ./check_permisos.sh --email      - Con envío de email
# =============================================================================

# Configuración (ajustar según tu instalación)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="${SCRIPT_DIR}/../backend"
PYTHON_ENV="${SCRIPT_DIR}/../venv/bin/python"
LOG_DIR="${SCRIPT_DIR}/../logs"
LOG_FILE="${LOG_DIR}/permisos_health.log"

# Colores para terminal
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Registrar inicio
log "============================================================================="
log "Iniciando verificación de salud del sistema RBAC"
log "============================================================================="

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR" || {
    log "ERROR: No se pudo acceder al directorio $PROJECT_DIR"
    exit 3
}

# Verificar que existe el entorno virtual
if [ ! -f "$PYTHON_ENV" ]; then
    log "ADVERTENCIA: No se encontró Python en $PYTHON_ENV, usando 'python' del PATH"
    PYTHON_ENV="python"
fi

# Construir comando
CMD="$PYTHON_ENV manage.py check_permisos_health --verbose"

# Agregar parámetros adicionales según argumentos
for arg in "$@"; do
    case $arg in
        --fix)
            CMD="$CMD --fix"
            ;;
        --email)
            CMD="$CMD --send-email"
            ;;
        --help)
            echo "Uso: $0 [--fix] [--email]"
            echo ""
            echo "Opciones:"
            echo "  --fix     Corregir automáticamente problemas detectados"
            echo "  --email   Enviar reporte por email a administradores"
            echo "  --help    Mostrar esta ayuda"
            exit 0
            ;;
    esac
done

# Ejecutar verificación
log "Comando: $CMD"
$CMD >> "$LOG_FILE" 2>&1

# Capturar código de salida
EXIT_CODE=$?

# Registrar resultado
log "Verificación completada con código: $EXIT_CODE"

# Interpretar código de salida
case $EXIT_CODE in
    0)
        log "${GREEN}RESULTADO: Sistema funcionando correctamente${NC}"
        ;;
    1)
        log "${YELLOW}RESULTADO: Advertencias detectadas${NC}"
        ;;
    2)
        log "${RED}RESULTADO: CRITICO - Problemas detectados${NC}"

        # Si hay problemas críticos y no se pidió corrección, intentar corregir
        if [[ ! " $* " =~ " --fix " ]]; then
            log "Intentando corrección automática..."
            $PYTHON_ENV manage.py check_permisos_health --fix >> "$LOG_FILE" 2>&1
            FIX_EXIT_CODE=$?
            log "Corrección completada con código: $FIX_EXIT_CODE"
        fi
        ;;
    *)
        log "${RED}RESULTADO: Error desconocido (código $EXIT_CODE)${NC}"
        ;;
esac

log ""

# Limpiar logs antiguos (más de 30 días) - ejecutar solo una vez al día a las 8 AM
CURRENT_HOUR=$(date +%H)
if [ "$CURRENT_HOUR" -eq 8 ]; then
    log "Limpiando logs antiguos (>30 días)..."
    find "$LOG_DIR" -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true
    log "Limpieza de logs completada"
fi

# Mostrar resumen en terminal (solo últimas líneas relevantes)
if [ -t 1 ]; then  # Si está en terminal interactivo
    echo ""
    echo "=== RESUMEN (últimas 20 líneas del log) ==="
    tail -n 20 "$LOG_FILE"
    echo ""
fi

exit $EXIT_CODE
