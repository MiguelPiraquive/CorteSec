#!/usr/bin/env python3
"""
Script para corregir automáticamente divs sobrantes
"""

import re

def fix_div_issues(file_path):
    """Corrige los problemas de divs de manera inteligente"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print("🔧 CORRIGIENDO PROBLEMAS DE DIVS")
    print("=" * 50)
    
    div_stack = []
    lines_to_remove = []
    corrected_lines = lines.copy()
    
    for line_num, line in enumerate(lines, 1):
        original_line = line.rstrip()
        
        # Contar aperturas y cierres
        opens = line.count('<div')
        closes = line.count('</div>')
        
        # Procesar aperturas
        for _ in range(opens):
            div_stack.append(line_num)
        
        # Procesar cierres
        for _ in range(closes):
            if div_stack:
                div_stack.pop()
            else:
                # Este es un cierre sobrante
                if original_line.strip() == '</div>':
                    # Es una línea que solo contiene el cierre, la marcamos para eliminar
                    lines_to_remove.append(line_num - 1)  # -1 porque lines es 0-indexed
                    print(f"🗑️  Marcando para eliminar línea {line_num}: '{original_line}'")
    
    # Eliminar líneas marcadas (de atrás hacia adelante para no afectar los índices)
    for line_idx in reversed(lines_to_remove):
        del corrected_lines[line_idx]
        print(f"✂️  Eliminada línea {line_idx + 1}")
    
    # Guardar archivo corregido
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(corrected_lines)
    
    print(f"✅ CORRECCIÓN COMPLETADA:")
    print(f"   • Líneas eliminadas: {len(lines_to_remove)}")
    print(f"   • Archivo actualizado: {file_path}")
    
    return len(lines_to_remove)

def validate_after_fix(file_path):
    """Valida la estructura después de la corrección"""
    
    print(f"\n🔍 VALIDACIÓN DESPUÉS DE LA CORRECCIÓN")
    print("=" * 50)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Contar divs
    total_open = content.count('<div')
    total_close = content.count('</div>')
    balance = total_open - total_close
    
    print(f"📊 BALANCE FINAL:")
    print(f"   • Aperturas <div>: {total_open}")
    print(f"   • Cierres </div>: {total_close}")
    print(f"   • Balance: {balance:+d}")
    
    if balance == 0:
        print("✅ ESTRUCTURA BALANCEADA")
    else:
        print(f"⚠️  ESTRUCTURA DESBALANCEADA: {abs(balance)} divs {'sobrantes' if balance < 0 else 'faltantes'}")
    
    return balance

if __name__ == "__main__":
    file_path = "dashboard/templates/dashboard/principal.html"
    
    # Realizar corrección
    removed_count = fix_div_issues(file_path)
    
    # Validar resultado
    final_balance = validate_after_fix(file_path)
    
    if final_balance == 0:
        print("\n🎉 ¡ESTRUCTURA HTML CORREGIDA EXITOSAMENTE!")
    else:
        print(f"\n⚠️  Aún quedan {abs(final_balance)} problemas por resolver")
