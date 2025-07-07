@echo off
echo ========================================
echo    SERVIDOR CORTESEC - MODO DESARROLLO
echo ========================================

cd /d "C:\Users\migue\Desktop\CorteSec\contractor_management"

echo [1/4] Verificando Django...
python manage.py check
if %errorlevel% neq 0 (
    echo ERROR: Problemas de configuración detectados
    pause
    exit /b 1
)

echo [2/4] Aplicando migraciones si es necesario...
python manage.py migrate --run-syncdb

echo [3/4] Limpiando cache del navegador...
echo.
echo ⚠️  IMPORTANTE: SIGUE ESTOS PASOS PARA EVITAR HTTPS:
echo.
echo 1. Abre Opera GX en MODO INCOGNITO (Ctrl+Shift+N)
echo 2. Ve a: http://localhost:8080 (NO uses 127.0.0.1)
echo 3. Si aparece advertencia de seguridad, haz clic en "Avanzado" y "Continuar"
echo.
echo ✅ URLs alternativas:
echo    - http://localhost:8080
echo    - http://localhost:8080/dashboard/
echo    - http://localhost:8080/admin/
echo.

echo [4/4] Iniciando servidor en puerto alternativo...
echo ========================================

python manage.py runserver localhost:8080 --insecure
