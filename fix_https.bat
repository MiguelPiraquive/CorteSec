@echo off
echo ========================================
echo    LIMPIAR CACHE NAVEGADOR - CORTESEC
echo ========================================

echo Cerrando Opera GX...
taskkill /f /im opera.exe 2>nul

echo Limpiando cache de HSTS (HTTPS forzado)...

REM Limpiar cache DNS
ipconfig /flushdns

echo.
echo ✅ PASOS PARA ABRIR SIN HTTPS:
echo.
echo 1. Abre Opera GX en MODO INCOGNITO (Ctrl+Shift+N)
echo 2. Deshabilita temporalmente:
echo    - Configuracion ^> Privacidad y seguridad ^> Seguridad
echo    - Desactivar "Usar una conexion segura"
echo 3. Ve a: http://localhost:8080
echo.
echo ⚠️  Si SIGUE apareciendo HTTPS:
echo    - Presiona F12 (DevTools)
echo    - Ve a "Application" o "Aplicacion"  
echo    - En "Storage" busca "Clear storage"
echo    - Haz clic en "Clear site data"
echo.

pause
echo.
echo Iniciando servidor en puerto 8080...
cd /d "C:\Users\migue\Desktop\CorteSec\contractor_management"
start_server.bat
