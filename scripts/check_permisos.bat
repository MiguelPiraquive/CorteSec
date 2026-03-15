@echo off
REM =============================================================================
REM Script de Verificación de Salud - Sistema RBAC CorteSec
REM =============================================================================
REM
REM Este script ejecuta la verificación periódica del sistema de permisos
REM y registra los resultados en un archivo de log.
REM
REM Uso:
REM   check_permisos.bat              - Verificación simple
REM   check_permisos.bat --fix        - Con corrección automática
REM   check_permisos.bat --email      - Con envío de email
REM =============================================================================

REM Configuración
set PROJECT_DIR=%~dp0..\backend
set PYTHON_EXE=python
set LOG_DIR=%~dp0..\logs
set LOG_FILE=%LOG_DIR%\permisos_health.log

REM Crear directorio de logs si no existe
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Registrar inicio
echo ============================================================================= >> %LOG_FILE%
echo [%date% %time%] Iniciando verificacion de salud del sistema RBAC >> %LOG_FILE%
echo ============================================================================= >> %LOG_FILE%

REM Cambiar al directorio del proyecto
cd /d "%PROJECT_DIR%"

REM Construir comando
set CMD=%PYTHON_EXE% manage.py check_permisos_health --verbose

REM Agregar parámetros adicionales según argumentos
if "%1"=="--fix" set CMD=%CMD% --fix
if "%1"=="--email" set CMD=%CMD% --send-email
if "%2"=="--fix" set CMD=%CMD% --fix
if "%2"=="--email" set CMD=%CMD% --send-email

REM Ejecutar verificación
echo [%date% %time%] Comando: %CMD% >> %LOG_FILE%
%CMD% >> %LOG_FILE% 2>&1

REM Capturar código de salida
set EXIT_CODE=%ERRORLEVEL%

REM Registrar resultado
echo [%date% %time%] Verificacion completada con codigo: %EXIT_CODE% >> %LOG_FILE%

REM Interpretar código de salida
if %EXIT_CODE% equ 0 (
    echo [%date% %time%] RESULTADO: Sistema funcionando correctamente >> %LOG_FILE%
) else if %EXIT_CODE% equ 1 (
    echo [%date% %time%] RESULTADO: Advertencias detectadas >> %LOG_FILE%
) else if %EXIT_CODE% equ 2 (
    echo [%date% %time%] RESULTADO: CRITICO - Problemas detectados >> %LOG_FILE%

    REM Si hay problemas críticos y no se pidió corrección, intentar corregir
    if not "%1"=="--fix" if not "%2"=="--fix" (
        echo [%date% %time%] Intentando corrección automática... >> %LOG_FILE%
        %PYTHON_EXE% manage.py check_permisos_health --fix >> %LOG_FILE% 2>&1
        set FIX_EXIT_CODE=!ERRORLEVEL!
        echo [%date% %time%] Corrección completada con código: !FIX_EXIT_CODE! >> %LOG_FILE%
    )
) else (
    echo [%date% %time%] RESULTADO: Error desconocido >> %LOG_FILE%
)

echo. >> %LOG_FILE%

REM Limpiar logs antiguos (más de 30 días) - ejecutar solo una vez al día
set HOUR=%time:~0,2%
if "%HOUR:~0,1%"==" " set HOUR=0%HOUR:~1,1%
if %HOUR% equ 8 (
    echo [%date% %time%] Limpiando logs antiguos... >> %LOG_FILE%
    forfiles /p "%LOG_DIR%" /s /m *.log /d -30 /c "cmd /c del @path" 2>nul
)

exit /b %EXIT_CODE%
