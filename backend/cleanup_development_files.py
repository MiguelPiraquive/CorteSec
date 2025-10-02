#!/usr/bin/env python3
"""
🧹 Script de Limpieza de Archivos de Desarrollo
==============================================

Este script elimina archivos que no son necesarios para producción:
- Archivos de testing (test_*.py)
- Scripts de utilidad de desarrollo
- Archivos de backup (.bak)
- Logs temporales
- Reportes de desarrollo (.md)

ADVERTENCIA: ¡Crear backup antes de ejecutar!
"""

import os
import shutil
from pathlib import Path

def cleanup_development_files():
    """
    Limpia archivos de desarrollo que no son necesarios en producción
    """
    base_path = Path(__file__).parent
    
    print("🧹 INICIANDO LIMPIEZA DE ARCHIVOS DE DESARROLLO")
    print("=" * 50)
    
    # Crear directorio para mover archivos (en lugar de eliminarlos)
    dev_backup_dir = base_path / "dev-backup"
    dev_backup_dir.mkdir(exist_ok=True)
    
    files_to_move = []
    
    # 1. ARCHIVOS DE TESTING
    print("\n📋 1. Archivos de Testing:")
    test_files = [
        "test_organizational_security.py",
        "test_multitenant_integration.py", 
        "test_multitenant.py",
        "test_integral_multitenant.py",
        "test_final_multitenant.py",
        "test_final.py",
        "test_drf_auth.py",
        "test_debug_isolation.py",
        "test_core_multitenant.py",
        "test_api_security.py",
        "test_api.py"
    ]
    
    for file_name in test_files:
        file_path = base_path / file_name
        if file_path.exists():
            files_to_move.append(file_path)
            print(f"   ✓ {file_name}")
    
    # 2. SCRIPTS DE UTILIDAD
    print("\n🔧 2. Scripts de Utilidad de Desarrollo:")
    utility_scripts = [
        "clean_migrations.py",
        "fix_organization_references.py",
        "fix_migration_history.py", 
        "fix_imports.py",
        "reset_migrations.py",
        "reset_complete.py",
        "update_imports.py",
        "enable_modules_systematically.py",
        "debug_endpoints.py",
        "setup_org_data.py",
        "verificar_multitenant.py",
        "verificar_usuario_piraquive.py",
        "verify_admin.py",
        "obtener_credenciales_piraquive.py",
        "get_token.py"
    ]
    
    for script_name in utility_scripts:
        script_path = base_path / script_name
        if script_path.exists():
            files_to_move.append(script_path)
            print(f"   ✓ {script_name}")
    
    # 3. ARCHIVOS DE BACKUP
    print("\n💾 3. Archivos de Backup (.bak):")
    bak_files = list(base_path.rglob("*.bak"))
    for bak_file in bak_files:
        if bak_file.is_file():
            files_to_move.append(bak_file)
            print(f"   ✓ {bak_file.relative_to(base_path)}")
    
    # 4. ARCHIVOS CORRUPTOS
    print("\n❌ 4. Archivos Corruptos/Backup:")
    corrupted_files = [
        "contractor_management/settings_corrupted_backup.py"
    ]
    
    for corrupted_file in corrupted_files:
        corrupted_path = base_path / corrupted_file
        if corrupted_path.exists():
            files_to_move.append(corrupted_path)
            print(f"   ✓ {corrupted_file}")
    
    # 5. LOGS TEMPORALES
    print("\n📝 5. Logs Temporales:")
    log_files = [
        "security.log",
        "django-error.log"
    ]
    
    for log_file in log_files:
        log_path = base_path / log_file
        if log_path.exists():
            files_to_move.append(log_path)
            print(f"   ✓ {log_file}")
    
    # 6. REPORTES DE DESARROLLO
    print("\n📊 6. Reportes de Desarrollo:")
    report_files = [
        "MULTITENANT_CORRECTION_SUMMARY.md",
        "organizational_security_report.json"
    ]
    
    for report_file in report_files:
        report_path = base_path / report_file
        if report_path.exists():
            files_to_move.append(report_path)
            print(f"   ✓ {report_file}")
    
    # 7. SCRIPTS DE POWERSHELL/BASH TEMPORALES
    print("\n🖥️ 7. Scripts de Sistema Temporales:")
    script_files = [
        "start_django.ps1",
        "start_django.sh", 
        "start_server.bat",
        "test_cors_completo.ps1",
        "test_cors.ps1"
    ]
    
    for script_file in script_files:
        script_path = base_path / script_file
        if script_path.exists():
            files_to_move.append(script_path)
            print(f"   ✓ {script_file}")
    
    # 8. ARCHIVOS JAVASCRIPT DE TESTING
    print("\n🌐 8. Scripts JS de Testing:")
    js_files = [
        "test_cors.js"
    ]
    
    for js_file in js_files:
        js_path = base_path / js_file
        if js_path.exists():
            files_to_move.append(js_path)
            print(f"   ✓ {js_file}")
    
    # RESUMEN
    print("\n" + "="*50)
    print(f"📦 TOTAL DE ARCHIVOS A MOVER: {len(files_to_move)}")
    print(f"📁 DESTINO: {dev_backup_dir}")
    
    if not files_to_move:
        print("✅ No hay archivos para limpiar")
        return
    
    # Confirmar antes de mover
    response = input("\n¿Deseas mover estos archivos a 'dev-backup'? (y/N): ")
    
    if response.lower() in ['y', 'yes', 'sí', 's']:
        print("\n🚀 Moviendo archivos...")
        
        moved_count = 0
        for file_path in files_to_move:
            try:
                # Crear subdirectorios si es necesario
                relative_path = file_path.relative_to(base_path)
                backup_path = dev_backup_dir / relative_path
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Mover archivo
                shutil.move(str(file_path), str(backup_path))
                moved_count += 1
                print(f"   ✓ {relative_path}")
                
            except Exception as e:
                print(f"   ❌ Error moviendo {file_path}: {e}")
        
        print(f"\n✅ COMPLETADO: {moved_count}/{len(files_to_move)} archivos movidos")
        print(f"📁 Archivos respaldados en: {dev_backup_dir}")
        print("\n💡 Para restaurar archivos: mueve desde 'dev-backup' de vuelta al directorio principal")
        
    else:
        print("\n❌ Operación cancelada")

if __name__ == "__main__":
    cleanup_development_files()