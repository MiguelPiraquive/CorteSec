#!/usr/bin/env python3
"""
Script para validar la estructura HTML del template principal.html
Detecta:
- Divs y tags no cerrados
- Tags de cierre sin apertura
- Desbalance de tags
- Estructura general del HTML
"""
import re
from collections import defaultdict, deque

def analyze_html_structure(file_path):
    """Analiza la estructura HTML del archivo especificado"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Stack para rastrear tags abiertos
    tag_stack = deque()
    errors = []
    warnings = []
    line_number = 1
    
    # Regex para encontrar tags HTML
    tag_pattern = r'<(/?)(\w+)(?:\s[^>]*)?>'
    
    # Tags que se autocierran
    self_closing_tags = {
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr'
    }
    
    # Contar líneas hasta cada posición
    lines = content.split('\n')
    pos_to_line = {}
    current_pos = 0
    for i, line in enumerate(lines, 1):
        for j in range(len(line) + 1):  # +1 para incluir el \n
            pos_to_line[current_pos + j] = i
        current_pos += len(line) + 1
    
    # Encontrar todos los tags
    for match in re.finditer(tag_pattern, content):
        is_closing = bool(match.group(1))
        tag_name = match.group(2).lower()
        line_num = pos_to_line.get(match.start(), 1)
        
        if tag_name in self_closing_tags:
            continue
            
        if is_closing:
            # Tag de cierre
            if not tag_stack:
                errors.append(f"Línea {line_num}: Tag de cierre '{tag_name}' sin apertura correspondiente")
            else:
                last_tag, last_line = tag_stack.pop()
                if last_tag != tag_name:
                    errors.append(f"Línea {line_num}: Tag de cierre '{tag_name}' no coincide con tag abierto '{last_tag}' (línea {last_line})")
                    # Intentar encontrar el tag correcto en el stack
                    temp_stack = []
                    found = False
                    while tag_stack:
                        temp_tag, temp_line = tag_stack.pop()
                        temp_stack.append((temp_tag, temp_line))
                        if temp_tag == tag_name:
                            found = True
                            break
                    
                    if found:
                        errors.append(f"  -> Tag '{last_tag}' (línea {last_line}) no fue cerrado correctamente")
                    else:
                        # Restaurar el stack
                        while temp_stack:
                            tag_stack.append(temp_stack.pop())
                        tag_stack.append((last_tag, last_line))
        else:
            # Tag de apertura
            tag_stack.append((tag_name, line_num))
    
    # Tags que quedaron sin cerrar
    while tag_stack:
        tag_name, line_num = tag_stack.pop()
        errors.append(f"Línea {line_num}: Tag '{tag_name}' no fue cerrado")
    
    # Análisis específico de divs
    div_count = content.count('<div')
    div_close_count = content.count('</div>')
    
    if div_count != div_close_count:
        errors.append(f"Desbalance de divs: {div_count} aperturas vs {div_close_count} cierres")
    
    # Buscar patrones problemáticos comunes
    problematic_patterns = [
        (r'<div[^>]*>\s*</div>', "Divs vacíos encontrados"),
        (r'<(\w+)[^>]*>\s*<\1[^>]*>', "Posibles tags anidados del mismo tipo sin contenido"),
        (r'</(\w+)>\s*</\1>', "Posibles tags de cierre duplicados"),
    ]
    
    for pattern, description in problematic_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            warnings.append(f"{description}: {len(matches)} ocurrencias")
    
    # Verificar estructura básica HTML
    if not re.search(r'<!DOCTYPE\s+html>', content, re.IGNORECASE):
        warnings.append("Falta declaración DOCTYPE")
    
    if not re.search(r'<html[^>]*>', content, re.IGNORECASE):
        warnings.append("Falta tag <html>")
    
    if not re.search(r'<head[^>]*>', content, re.IGNORECASE):
        warnings.append("Falta tag <head>")
    
    if not re.search(r'<body[^>]*>', content, re.IGNORECASE):
        warnings.append("Falta tag <body>")
    
    return errors, warnings

def main():
    file_path = 'dashboard/templates/dashboard/principal.html'
    
    print("🔍 Analizando estructura HTML del template principal...")
    print("=" * 60)
    
    try:
        errors, warnings = analyze_html_structure(file_path)
        
        if errors:
            print(f"❌ ERRORES ENCONTRADOS ({len(errors)}):")
            print("-" * 40)
            for i, error in enumerate(errors, 1):
                print(f"{i:3d}. {error}")
        else:
            print("✅ No se encontraron errores de estructura")
        
        if warnings:
            print(f"\n⚠️  ADVERTENCIAS ({len(warnings)}):")
            print("-" * 40)
            for i, warning in enumerate(warnings, 1):
                print(f"{i:3d}. {warning}")
        
        if not errors and not warnings:
            print("🎉 El archivo HTML tiene una estructura correcta!")
        
        print("\n" + "=" * 60)
        print(f"📊 RESUMEN: {len(errors)} errores, {len(warnings)} advertencias")
        
    except FileNotFoundError:
        print(f"❌ Error: No se pudo encontrar el archivo {file_path}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    main()
