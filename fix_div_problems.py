#!/usr/bin/env python3
"""
Script para identificar y corregir los divs problemáticos en principal.html
"""

import re

def find_problematic_divs(file_path):
    """Identifica las líneas exactas con divs problemáticos"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    div_stack = []
    problematic_lines = []
    
    print("🔍 IDENTIFICANDO DIVS PROBLEMÁTICOS")
    print("=" * 50)
    
    for line_num, line in enumerate(lines, 1):
        original_line = line.rstrip()
        
        # Contar aperturas y cierres de div en esta línea
        opens = line.count('<div')
        closes = line.count('</div>')
        
        # Agregar aperturas al stack
        for _ in range(opens):
            div_stack.append(line_num)
        
        # Procesar cierres
        for _ in range(closes):
            if div_stack:
                div_stack.pop()
            else:
                # Este es un cierre sin apertura correspondiente
                problematic_lines.append({
                    'line_num': line_num,
                    'type': 'extra_close',
                    'content': original_line,
                    'problem': 'Cierre de div sin apertura correspondiente'
                })
    
    # Agregar divs sin cerrar
    for open_line in div_stack:
        problematic_lines.append({
            'line_num': open_line,
            'type': 'missing_close',
            'content': lines[open_line - 1].rstrip(),
            'problem': 'Apertura de div sin cierre correspondiente'
        })
    
    # Mostrar resultados
    print(f"\n📊 RESULTADOS:")
    print(f"• Cierres de div sin apertura: {len([p for p in problematic_lines if p['type'] == 'extra_close'])}")
    print(f"• Aperturas de div sin cierre: {len([p for p in problematic_lines if p['type'] == 'missing_close'])}")
    
    # Mostrar líneas problemáticas ordenadas
    problematic_lines.sort(key=lambda x: x['line_num'])
    
    print(f"\n🚨 LÍNEAS PROBLEMÁTICAS:")
    for i, problem in enumerate(problematic_lines, 1):
        print(f"\n{i}. Línea {problem['line_num']} - {problem['problem']}")
        print(f"   {problem['content']}")
        
        # Mostrar contexto (líneas alrededor)
        start_ctx = max(0, problem['line_num'] - 3)
        end_ctx = min(len(lines), problem['line_num'] + 2)
        
        print("   Contexto:")
        for ctx_line_num in range(start_ctx, end_ctx):
            marker = " >>>>" if ctx_line_num + 1 == problem['line_num'] else "     "
            print(f"   {marker} {ctx_line_num + 1:4d}: {lines[ctx_line_num].rstrip()}")
    
    return problematic_lines

def analyze_specific_sections(file_path):
    """Analiza secciones específicas que suelen tener problemas"""
    
    print(f"\n🔍 ANÁLISIS DE SECCIONES ESPECÍFICAS")
    print("=" * 50)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.split('\n')
    
    # Buscar secciones comunes problemáticas
    sections_to_check = [
        ("Header/Navigation", 1, 100),
        ("Filtros principales", 100, 300),
        ("Panel de búsqueda", 300, 500),
        ("Dashboard content", 500, 700),
        ("Footer/Scripts", 700, len(lines))
    ]
    
    for section_name, start, end in sections_to_check:
        print(f"\n📦 {section_name} (líneas {start}-{end}):")
        
        section_lines = lines[start-1:end]
        div_balance = 0
        
        for i, line in enumerate(section_lines, start):
            opens = line.count('<div')
            closes = line.count('</div>')
            div_balance += opens - closes
        
        if div_balance != 0:
            print(f"  ❌ Balance de divs: {div_balance:+d}")
        else:
            print(f"  ✅ Balance de divs: correcto")

def suggest_fixes(problematic_lines):
    """Sugiere correcciones para los problemas encontrados"""
    
    print(f"\n💡 SUGERENCIAS DE CORRECCIÓN")
    print("=" * 50)
    
    extra_closes = [p for p in problematic_lines if p['type'] == 'extra_close']
    missing_closes = [p for p in problematic_lines if p['type'] == 'missing_close']
    
    if extra_closes:
        print(f"\n🔧 Para los {len(extra_closes)} cierres extra de div:")
        print("   1. Opción SIMPLE: Eliminar las líneas con cierres sobrantes")
        print("   2. Opción COMPLETA: Revisar si falta la apertura correspondiente")
        
        print(f"\n   Líneas a eliminar (cierres sobrantes):")
        for problem in extra_closes[:10]:
            if problem['content'].strip() == '</div>':
                print(f"   • Línea {problem['line_num']}: {problem['content']}")
    
    if missing_closes:
        print(f"\n🔧 Para los {len(missing_closes)} divs sin cerrar:")
        print("   Agregar </div> al final de las secciones correspondientes")
    
    print(f"\n📋 PLAN DE CORRECCIÓN RECOMENDADO:")
    print("   1. Eliminar cierres de div sobrantes (líneas que solo contienen '</div>')")
    print("   2. Verificar que las secciones principales estén bien cerradas")
    print("   3. Validar la estructura después de cada corrección")

if __name__ == "__main__":
    file_path = "dashboard/templates/dashboard/principal.html"
    
    # Análisis principal
    problematic_lines = find_problematic_divs(file_path)
    
    # Análisis por secciones
    analyze_specific_sections(file_path)
    
    # Sugerencias
    suggest_fixes(problematic_lines)
