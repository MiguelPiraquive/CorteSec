#!/usr/bin/env python3
"""
Script para validar la estructura HTML del template del dashboard
"""

import re
import sys
from collections import defaultdict

def validate_html_structure(file_path):
    """Valida la estructura HTML buscando problemas comunes"""
    
    print("🔍 Analizando estructura HTML del template dashboard...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    errors = []
    warnings = []
    
    # Stack para rastrear tags abiertas
    tag_stack = []
    line_number = 0
    
    # Tags que se auto-cierran
    self_closing_tags = {'input', 'img', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'}
    
    # Tags que normalmente deben tener cierre
    container_tags = {'div', 'span', 'p', 'a', 'button', 'form', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot'}
    
    # Buscar tags HTML
    tag_pattern = r'<(/?)(\w+)(?:\s[^>]*)?/?>'
    
    for i, line in enumerate(lines, 1):
        line_number = i
        
        # Buscar todos los tags en la línea
        matches = re.finditer(tag_pattern, line)
        
        for match in matches:
            is_closing = bool(match.group(1))  # Si tiene /
            tag_name = match.group(2).lower()
            full_match = match.group(0)
            
            # Ignorar tags de Django/Jinja
            if tag_name in ['extends', 'load', 'block', 'endblock', 'trans', 'static', 'if', 'endif', 'for', 'endfor']:
                continue
            
            # Tag auto-cerrante
            if full_match.endswith('/>') or tag_name in self_closing_tags:
                continue
            
            if is_closing:
                # Tag de cierre
                if not tag_stack:
                    errors.append(f"Línea {line_number}: Tag de cierre '{tag_name}' sin apertura correspondiente")
                else:
                    last_tag, last_line = tag_stack.pop()
                    if last_tag != tag_name:
                        errors.append(f"Línea {line_number}: Tag de cierre '{tag_name}' no coincide con tag abierto '{last_tag}' (línea {last_line})")
            else:
                # Tag de apertura
                tag_stack.append((tag_name, line_number))
    
    # Verificar tags sin cerrar
    while tag_stack:
        tag_name, line_num = tag_stack.pop()
        errors.append(f"Línea {line_num}: Tag '{tag_name}' abierto pero no cerrado")
    
    # Verificar anidamiento de divs
    div_count = content.count('<div')
    div_close_count = content.count('</div>')
    
    if div_count != div_close_count:
        errors.append(f"Desbalance de divs: {div_count} aperturas vs {div_close_count} cierres")
    
    # Verificar Alpine.js attributes
    alpine_pattern = r'x-[a-z]+'
    alpine_matches = re.findall(alpine_pattern, content)
    alpine_usage = defaultdict(int)
    for attr in alpine_matches:
        alpine_usage[attr] += 1
    
    # Verificar problemas específicos
    
    # 1. Divs sin clase (posibles errores)
    empty_divs = re.findall(r'<div\s*>', content)
    if empty_divs:
        warnings.append(f"Encontrados {len(empty_divs)} divs sin atributos (posible error)")
    
    # 2. Tags no cerrados comunes
    unclosed_patterns = [
        (r'<template(?:\s[^>]*)?>(?!.*</template>)', 'template'),
        (r'<script(?:\s[^>]*)?>(?!.*</script>)', 'script'),
        (r'<style(?:\s[^>]*)?>(?!.*</style>)', 'style')
    ]
    
    for pattern, tag_name in unclosed_patterns:
        if re.search(pattern, content, re.DOTALL):
            warnings.append(f"Posible tag '{tag_name}' sin cerrar")
    
    # 3. Verificar estructura Alpine.js
    main_alpine_div = re.search(r'<div[^>]*x-data[^>]*>', content)
    if not main_alpine_div:
        warnings.append("No se encontró div principal con x-data")
    
    # 4. Verificar IDs duplicados
    id_pattern = r'id=["\']([^"\']+)["\']'
    ids = re.findall(id_pattern, content)
    duplicate_ids = [id_val for id_val in set(ids) if ids.count(id_val) > 1]
    if duplicate_ids:
        errors.append(f"IDs duplicados encontrados: {duplicate_ids}")
    
    # Reporte
    print(f"\n📊 RESUMEN DEL ANÁLISIS:")
    print(f"   Líneas totales: {len(lines)}")
    print(f"   Tags div: {div_count} aperturas, {div_close_count} cierres")
    print(f"   Alpine.js attributes: {len(alpine_matches)} usos")
    print(f"   Atributos Alpine únicos: {list(alpine_usage.keys())}")
    
    if errors:
        print(f"\n❌ ERRORES ENCONTRADOS ({len(errors)}):")
        for error in errors:
            print(f"   • {error}")
    else:
        print(f"\n✅ NO SE ENCONTRARON ERRORES DE ESTRUCTURA")
    
    if warnings:
        print(f"\n⚠️  ADVERTENCIAS ({len(warnings)}):")
        for warning in warnings:
            print(f"   • {warning}")
    
    # Verificaciones adicionales específicas
    print(f"\n🔧 VERIFICACIONES ESPECÍFICAS:")
    
    # Verificar cierre del div principal
    main_div_pattern = r'<div[^>]*x-data="dashboardStore\(\)"[^>]*>'
    if re.search(main_div_pattern, content):
        print(f"   ✅ Div principal Alpine.js encontrado")
        
        # Contar nivel de anidamiento al final
        lines_reversed = list(reversed(lines))
        closing_divs = 0
        for line in lines_reversed:
            if '</div>' in line:
                closing_divs += line.count('</div>')
                break
        
        if closing_divs > 0:
            print(f"   ✅ Se encontraron divs de cierre al final")
        else:
            print(f"   ⚠️  No se encontraron divs de cierre claros al final")
    
    # Verificar estructura de filtros
    if 'showFilters' in content:
        print(f"   ✅ Estructura de filtros encontrada")
    
    # Verificar estructura de métricas
    if 'dashboard-metrics-data' in content:
        print(f"   ✅ Contenedor de métricas encontrado")
    
    return len(errors) == 0, errors, warnings

if __name__ == '__main__':
    file_path = 'dashboard/templates/dashboard/principal.html'
    is_valid, errors, warnings = validate_html_structure(file_path)
    
    if is_valid:
        print(f"\n🎉 TEMPLATE HTML VÁLIDO")
        exit(0)
    else:
        print(f"\n💥 TEMPLATE HTML TIENE ERRORES")
        exit(1)
