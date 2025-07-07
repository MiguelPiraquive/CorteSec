#!/usr/bin/env python3
"""
Script para mostrar líneas específicas problemáticas con divs
"""

import re

def show_problematic_lines():
    """Muestra las líneas específicas que tienen problemas"""
    
    with open("dashboard/templates/dashboard/principal.html", 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Lista de líneas problemáticas del análisis anterior
    problematic_line_numbers = [42, 445, 446, 528, 534, 535, 566, 567, 585, 666]
    
    print("🔍 REVISIÓN ESPECÍFICA DE LÍNEAS PROBLEMÁTICAS")
    print("=" * 60)
    
    for line_num in problematic_line_numbers:
        if line_num <= len(lines):
            print(f"\n📍 LÍNEA {line_num}:")
            
            # Mostrar contexto de 5 líneas antes y después
            start = max(0, line_num - 6)
            end = min(len(lines), line_num + 5)
            
            for i in range(start, end):
                marker = " >>>>" if i + 1 == line_num else "     "
                content = lines[i].rstrip()
                print(f"{marker} {i+1:4d}: {content}")
                
                # Análisis específico de la línea problemática
                if i + 1 == line_num:
                    if content.strip() == '</div>':
                        print(f"         ❌ PROBLEMA: Cierre de div solitario sin apertura")
                    elif content.count('</div>') > content.count('<div'):
                        print(f"         ❌ PROBLEMA: Más cierres que aperturas en esta línea")
                    elif '<div' in content and '</div>' in content:
                        opens = content.count('<div')
                        closes = content.count('</div>')
                        print(f"         ℹ️  Esta línea: {opens} aperturas, {closes} cierres")
            
            print("-" * 60)

def find_all_extra_closing_divs():
    """Encuentra todos los divs de cierre sobrantes"""
    
    with open("dashboard/templates/dashboard/principal.html", 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"\n🎯 TODAS LAS LÍNEAS CON CIERRES DE DIV SOBRANTES:")
    print("=" * 60)
    
    div_stack = []
    extra_closes = []
    
    for line_num, line in enumerate(lines, 1):
        # Contar aperturas y cierres
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
                # Este es un cierre sobrante
                extra_closes.append({
                    'line': line_num,
                    'content': line.rstrip()
                })
    
    print(f"📊 ENCONTRADOS {len(extra_closes)} CIERRES SOBRANTES:")
    
    for i, problem in enumerate(extra_closes, 1):
        print(f"\n{i}. Línea {problem['line']}:")
        print(f"   {problem['content']}")
        
        # Verificar si es un div solitario
        if problem['content'].strip() == '</div>':
            print(f"   ✂️  ACCIÓN: Eliminar esta línea completa")
        else:
            print(f"   ⚠️  ACCIÓN: Revisar manualmente - contiene más contenido")

if __name__ == "__main__":
    show_problematic_lines()
    find_all_extra_closing_divs()
