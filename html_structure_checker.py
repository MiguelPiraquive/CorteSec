#!/usr/bin/env python3
"""
Script para revisar la estructura HTML del template principal.html
Detecta divs mal cerrados, tags desbalanceados, y otros problemas estructurales.
"""

import re
from collections import defaultdict

def analyze_html_structure(file_path):
    """Analiza la estructura HTML del archivo y detecta problemas"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # Contadores para diferentes elementos
    div_stack = []
    tag_counts = defaultdict(int)
    problems = []
    
    # Patrones para detectar tags
    opening_tag_pattern = re.compile(r'<(\w+)(?:\s[^>]*)?(?<!/)>')
    closing_tag_pattern = re.compile(r'</(\w+)>')
    self_closing_pattern = re.compile(r'<(\w+)(?:\s[^>]*)?/>')
    
    # Tags que pueden ser auto-cerrados
    self_closing_tags = {'img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'}
    
    # Tags que no necesitan cierre
    void_elements = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
    
    print("🔍 ANÁLISIS DE ESTRUCTURA HTML")
    print("=" * 50)
    
    for line_num, line in enumerate(lines, 1):
        line_stripped = line.strip()
        
        # Buscar tags auto-cerrados
        self_closing_matches = self_closing_pattern.findall(line)
        for tag in self_closing_matches:
            tag_counts[f'{tag}_self_closing'] += 1
        
        # Buscar tags de apertura
        opening_matches = opening_tag_pattern.findall(line)
        for tag in opening_matches:
            # Ignorar tags auto-cerrados y void elements
            if tag not in void_elements:
                tag_counts[f'{tag}_open'] += 1
                if tag == 'div':
                    div_stack.append((line_num, line_stripped))
        
        # Buscar tags de cierre
        closing_matches = closing_tag_pattern.findall(line)
        for tag in closing_matches:
            tag_counts[f'{tag}_close'] += 1
            if tag == 'div':
                if div_stack:
                    div_stack.pop()
                else:
                    problems.append({
                        'type': 'div_close_without_open',
                        'line': line_num,
                        'content': line_stripped,
                        'message': f'Línea {line_num}: </div> sin <div> correspondiente'
                    })
    
    # Verificar divs sin cerrar
    if div_stack:
        for line_num, content in div_stack:
            problems.append({
                'type': 'div_open_without_close',
                'line': line_num,
                'content': content,
                'message': f'Línea {line_num}: <div> sin cierre'
            })
    
    # Análisis de balance de tags
    print("\n📊 BALANCE DE TAGS PRINCIPALES:")
    important_tags = ['div', 'section', 'article', 'header', 'footer', 'main', 'nav', 'aside', 'form', 'table', 'ul', 'ol', 'li']
    
    for tag in important_tags:
        open_count = tag_counts.get(f'{tag}_open', 0)
        close_count = tag_counts.get(f'{tag}_close', 0)
        balance = open_count - close_count
        
        if balance != 0:
            status = "❌" if balance != 0 else "✅"
            print(f"{status} <{tag}>: {open_count} aberturas, {close_count} cierres (balance: {balance:+d})")
        elif open_count > 0:
            print(f"✅ <{tag}>: {open_count} aberturas, {close_count} cierres (balanceado)")
    
    # Mostrar problemas encontrados
    print(f"\n🚨 PROBLEMAS DETECTADOS ({len(problems)}):")
    if not problems:
        print("✅ No se detectaron problemas de estructura")
    else:
        # Agrupar problemas por tipo
        div_problems = [p for p in problems if 'div' in p['type']]
        
        if div_problems:
            print(f"\n📦 PROBLEMAS CON DIVS ({len(div_problems)}):")
            for problem in div_problems[:10]:  # Mostrar solo los primeros 10
                print(f"  • {problem['message']}")
                print(f"    Contenido: {problem['content'][:80]}...")
            
            if len(div_problems) > 10:
                print(f"    ... y {len(div_problems) - 10} problemas más con divs")
    
    # Buscar patrones problemáticos específicos
    print(f"\n🔍 PATRONES PROBLEMÁTICOS ESPECÍFICOS:")
    
    # Buscar líneas con múltiples cierres de div
    multiple_div_closes = []
    for line_num, line in enumerate(lines, 1):
        div_close_count = line.count('</div>')
        if div_close_count > 2:
            multiple_div_closes.append((line_num, div_close_count, line.strip()))
    
    if multiple_div_closes:
        print(f"🔴 Líneas con múltiples cierres de div ({len(multiple_div_closes)}):")
        for line_num, count, content in multiple_div_closes[:5]:
            print(f"  • Línea {line_num}: {count} cierres de </div>")
            print(f"    {content[:100]}...")
    
    # Buscar divs sin contenido entre apertura y cierre en la misma línea
    empty_divs = []
    empty_div_pattern = re.compile(r'<div[^>]*>\s*</div>')
    for line_num, line in enumerate(lines, 1):
        if empty_div_pattern.search(line):
            empty_divs.append((line_num, line.strip()))
    
    if empty_divs:
        print(f"\n📦 Divs vacíos encontrados ({len(empty_divs)}):")
        for line_num, content in empty_divs[:5]:
            print(f"  • Línea {line_num}: {content}")
    
    # Buscar posibles problemas de anidamiento
    print(f"\n🏗️ ANÁLISIS DE ANIDAMIENTO:")
    max_nesting = 0
    current_nesting = 0
    deep_nesting_lines = []
    
    for line_num, line in enumerate(lines, 1):
        # Contar aperturas y cierres de div en la línea
        opens = line.count('<div')
        closes = line.count('</div>')
        current_nesting += opens - closes
        
        if current_nesting > max_nesting:
            max_nesting = current_nesting
        
        if current_nesting > 15:  # Anidamiento muy profundo
            deep_nesting_lines.append((line_num, current_nesting))
    
    print(f"📏 Nivel máximo de anidamiento: {max_nesting}")
    
    if deep_nesting_lines:
        print(f"⚠️ Líneas con anidamiento muy profundo (>15 niveles):")
        for line_num, level in deep_nesting_lines[:5]:
            print(f"  • Línea {line_num}: Nivel {level}")
    
    # Resumen final
    print(f"\n📋 RESUMEN:")
    total_divs_open = tag_counts.get('div_open', 0)
    total_divs_close = tag_counts.get('div_close', 0)
    div_balance = total_divs_open - total_divs_close
    
    print(f"• Total divs de apertura: {total_divs_open}")
    print(f"• Total divs de cierre: {total_divs_close}")
    print(f"• Balance de divs: {div_balance:+d}")
    print(f"• Problemas estructurales: {len(problems)}")
    print(f"• Nivel máximo de anidamiento: {max_nesting}")
    
    if div_balance == 0 and len(problems) == 0:
        print("✅ ESTRUCTURA HTML CORRECTA")
    else:
        print("❌ ESTRUCTURA HTML CON PROBLEMAS - REQUIERE CORRECCIÓN")
    
    return {
        'problems': problems,
        'tag_counts': tag_counts,
        'div_balance': div_balance,
        'max_nesting': max_nesting
    }

if __name__ == "__main__":
    file_path = "dashboard/templates/dashboard/principal.html"
    results = analyze_html_structure(file_path)
