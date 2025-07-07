#!/usr/bin/env python3
"""
Script para validar la estructura HTML del template principal.html
Busca problemas de estructura, divs mal cerrados, tags desbalanceados, etc.
"""

import re
from collections import defaultdict

def analyze_html_structure(file_path):
    """Analiza la estructura HTML buscando problemas comunes"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # Contadores y estructuras
    tag_stack = []
    div_balance = 0
    issues = []
    line_issues = defaultdict(list)
    
    # Patrones regex
    opening_tag_pattern = r'<(\w+)(?:\s[^>]*)?(?<!/)>'
    closing_tag_pattern = r'</(\w+)>'
    self_closing_pattern = r'<(\w+)(?:\s[^>]*)?/>'
    
    # Tags que se pueden auto-cerrar
    void_elements = {
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr'
    }
    
    print("🔍 Analizando estructura HTML...")
    print("=" * 60)
    
    for line_num, line in enumerate(lines, 1):
        line_stripped = line.strip()
        
        # Buscar tags de apertura
        opening_matches = re.finditer(opening_tag_pattern, line)
        for match in opening_matches:
            tag = match.group(1).lower()
            if tag not in void_elements:
                tag_stack.append((tag, line_num))
                if tag == 'div':
                    div_balance += 1
        
        # Buscar tags de cierre
        closing_matches = re.finditer(closing_tag_pattern, line)
        for match in closing_matches:
            tag = match.group(1).lower()
            if tag == 'div':
                div_balance -= 1
            
            # Verificar si hay un tag de apertura correspondiente
            found = False
            for i in range(len(tag_stack) - 1, -1, -1):
                if tag_stack[i][0] == tag:
                    tag_stack.pop(i)
                    found = True
                    break
            
            if not found:
                line_issues[line_num].append(f"Tag de cierre </{tag}> sin apertura correspondiente")
        
        # Buscar tags auto-cerrados
        self_closing_matches = re.finditer(self_closing_pattern, line)
        for match in self_closing_matches:
            tag = match.group(1).lower()
            # Estos no afectan el balance
    
    # Reportar problemas
    print(f"📊 RESUMEN DEL ANÁLISIS:")
    print(f"   • Total de líneas: {len(lines)}")
    print(f"   • Balance de DIVs: {div_balance}")
    print(f"   • Tags sin cerrar: {len(tag_stack)}")
    print(f"   • Líneas con problemas: {len(line_issues)}")
    print()
    
    # Mostrar balance de divs
    if div_balance != 0:
        print("⚠️  PROBLEMA DE BALANCE DE DIVS:")
        if div_balance > 0:
            print(f"   Hay {div_balance} DIVs de apertura sin cerrar")
        else:
            print(f"   Hay {abs(div_balance)} DIVs de cierre de más")
        print()
    
    # Mostrar tags sin cerrar
    if tag_stack:
        print("🔓 TAGS SIN CERRAR:")
        for tag, line_num in tag_stack[-10:]:  # Mostrar últimos 10
            print(f"   Línea {line_num}: <{tag}> sin cerrar")
        if len(tag_stack) > 10:
            print(f"   ... y {len(tag_stack) - 10} más")
        print()
    
    # Mostrar líneas problemáticas
    if line_issues:
        print("❌ LÍNEAS CON PROBLEMAS:")
        sorted_issues = sorted(line_issues.items())
        for line_num, problems in sorted_issues[:20]:  # Mostrar primeras 20
            print(f"   Línea {line_num}:")
            for problem in problems:
                print(f"      • {problem}")
        if len(line_issues) > 20:
            print(f"   ... y {len(line_issues) - 20} líneas más con problemas")
        print()
    
    # Análisis específico de divs
    print("📋 ANÁLISIS ESPECÍFICO DE DIVS:")
    div_opens = 0
    div_closes = 0
    
    for line_num, line in enumerate(lines, 1):
        div_open_count = len(re.findall(r'<div(?:\s[^>]*)?(?<!/)>', line))
        div_close_count = len(re.findall(r'</div>', line))
        
        div_opens += div_open_count
        div_closes += div_close_count
        
        if div_open_count > 0 or div_close_count > 0:
            balance_line = div_open_count - div_close_count
            if abs(balance_line) > 1:  # Líneas con desbalance significativo
                print(f"   Línea {line_num}: +{div_open_count} -{div_close_count} (balance: {balance_line:+d})")
    
    print(f"   Total DIVs apertura: {div_opens}")
    print(f"   Total DIVs cierre: {div_closes}")
    print(f"   Balance final: {div_opens - div_closes}")
    print()
    
    # Buscar patrones problemáticos comunes
    print("🔍 PATRONES PROBLEMÁTICOS COMUNES:")
    
    # Divs vacíos
    empty_divs = re.findall(r'<div[^>]*></div>', content)
    if empty_divs:
        print(f"   • {len(empty_divs)} divs vacíos encontrados")
    
    # Divs con solo espacios
    whitespace_divs = re.findall(r'<div[^>]*>\s*</div>', content)
    if whitespace_divs:
        print(f"   • {len(whitespace_divs)} divs con solo espacios")
    
    # Tags mal anidados (aproximación)
    nested_same_tags = re.findall(r'<(\w+)[^>]*><\1[^>]*>', content)
    if nested_same_tags:
        print(f"   • Posible anidamiento incorrecto de tags similares: {len(nested_same_tags)}")
    
    print()
    
    # Recomendaciones
    print("💡 RECOMENDACIONES:")
    if div_balance != 0:
        print("   1. Revisar y corregir el balance de divs")
    if tag_stack:
        print("   2. Cerrar todos los tags abiertos")
    if line_issues:
        print("   3. Revisar líneas con tags de cierre sin apertura")
    print("   4. Usar un editor con resaltado de sintaxis HTML")
    print("   5. Considerar usar un validador HTML online")
    print("   6. Estructurar el código con indentación consistente")
    
    return {
        'div_balance': div_balance,
        'unclosed_tags': len(tag_stack),
        'problematic_lines': len(line_issues),
        'total_lines': len(lines)
    }

if __name__ == "__main__":
    file_path = "dashboard/templates/dashboard/principal.html"
    results = analyze_html_structure(file_path)
    
    print("\n" + "="*60)
    print("✅ ANÁLISIS COMPLETADO")
    print("="*60)
