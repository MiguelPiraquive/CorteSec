#!/usr/bin/env python
"""
Script de inicialización para asegurar que el proyecto esté listo
tanto en desarrollo como en producción.
"""
import os
import sys
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.conf import settings

def verificar_archivos_estaticos():
    """Verifica que los archivos estáticos estén en su lugar"""
    print("🔍 Verificando archivos estáticos...")
    
    # Verificar que existe la carpeta static
    static_dir = settings.BASE_DIR / 'static'
    if not static_dir.exists():
        print("❌ Error: La carpeta 'static' no existe")
        return False
    
    # Verificar archivos críticos
    archivos_criticos = [
        'static/css/tailwind.css',
        'static/js/dashboard-globals.js',
        'static/css/base-improvements.css',
    ]
    
    for archivo in archivos_criticos:
        ruta_archivo = settings.BASE_DIR / archivo
        if not ruta_archivo.exists():
            print(f"❌ Error: Archivo crítico no encontrado: {archivo}")
            return False
        else:
            print(f"✅ Encontrado: {archivo}")
    
    # Verificar carpeta staticfiles en producción
    if not settings.DEBUG:
        staticfiles_dir = Path(settings.STATIC_ROOT)
        if not staticfiles_dir.exists():
            print("⚠️  Carpeta 'staticfiles' no existe, ejecutando collectstatic...")
            execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])
        else:
            print("✅ Carpeta 'staticfiles' existe")
    
    print("✅ Verificación de archivos estáticos completada")
    return True

def main():
    """Función principal de inicialización"""
    print("🚀 Iniciando verificación del sistema...")
    
    # Verificar archivos estáticos
    if not verificar_archivos_estaticos():
        print("❌ Error en la verificación de archivos estáticos")
        sys.exit(1)
    
    print("✅ Sistema verificado correctamente")

if __name__ == '__main__':
    main()
