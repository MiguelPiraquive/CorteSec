#!/usr/bin/env python3
"""
Script para encontrar dónde faltan cierres de div
"""

def find_missing_div_closes(file_path):
    """Encuentra dónde faltan cierres de div"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print("🔍 IDENTIFICANDO DIVS SIN CERRAR")
    print("=" * 50)
    
    div_stack = []  # Stack para rastrear divs abiertos
    
    for line_num, line in enumerate(lines, 1):
        # Contar aperturas y cierres en la línea
        opens = line.count('<div')
        closes = line.count('</div>')
        
        # Agregar aperturas al stack
        for _ in range(opens):
            div_stack.append({
                'line': line_num,
                'content': line.rstrip()[:100] + ('...' if len(line.rstrip()) > 100 else ''),
                'context': 'div opened'
            })
        
        # Remover cierres del stack
        for _ in range(closes):
            if div_stack:
                div_stack.pop()
    
    print(f"📊 RESULTADO:")
    print(f"   • Divs sin cerrar: {len(div_stack)}")
    
    if div_stack:
        print(f"\n📦 DIVS QUE NECESITAN CIERRE:")
        for i, div_info in enumerate(div_stack, 1):
            print(f"\n{i}. Línea {div_info['line']}:")
            print(f"   {div_info['content']}")
            
            # Mostrar contexto alrededor de la línea
            print("   Contexto:")
            start_ctx = max(0, div_info['line'] - 3)
            end_ctx = min(len(lines), div_info['line'] + 2)
            
            for ctx_line_num in range(start_ctx, end_ctx):
                marker = " >>>>" if ctx_line_num + 1 == div_info['line'] else "     "
                content = lines[ctx_line_num].rstrip()
                print(f"   {marker} {ctx_line_num + 1:4d}: {content}")
    
    # Sugerir dónde agregar los cierres
    if div_stack:
        print(f"\n💡 SUGERENCIAS:")
        print("   Los cierres de div faltantes probablemente deben agregarse:")
        print("   1. Al final de secciones importantes")
        print("   2. Antes del final del archivo")
        print("   3. Donde termina el contenido principal")
        
        # Buscar lugares comunes donde agregar cierres
        suggest_locations(lines, len(div_stack))

def suggest_locations(lines, missing_count):
    """Sugiere ubicaciones donde agregar los cierres faltantes"""
    
    print(f"\n🎯 UBICACIONES SUGERIDAS PARA AGREGAR {missing_count} CIERRES:")
    
    # Buscar comentarios que indican fin de secciones
    section_ends = []
    for line_num, line in enumerate(lines, 1):
        content = line.strip().lower()
        if ('<!-- scripts' in content or 
            '<!-- fin' in content or 
            '<!-- end' in content or
            '</body>' in content or
            '</html>' in content):
            section_ends.append((line_num, line.strip()))
    
    print("\n   Posibles ubicaciones:")
    for line_num, content in section_ends[:5]:
        print(f"   • Antes de línea {line_num}: {content}")
    
    # También sugerir el final del archivo
    print(f"\n   O al final del archivo (línea {len(lines)})")

def find_structure_sections(file_path):
    """Identifica las secciones principales del archivo"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"\n📋 ESTRUCTURA PRINCIPAL DEL ARCHIVO:")
    print("=" * 50)
    
    sections = []
    current_section = None
    
    for line_num, line in enumerate(lines, 1):
        content = line.strip()
        
        # Detectar comentarios que indican secciones
        if '<!--' in content and '-->' in content:
            if any(keyword in content.lower() for keyword in 
                   ['header', 'nav', 'filtros', 'dashboard', 'grid', 'scripts', 'loading', 'main']):
                sections.append((line_num, content))
    
    for i, (line_num, content) in enumerate(sections, 1):
        print(f"{i:2d}. Línea {line_num:4d}: {content}")

if __name__ == "__main__":
    file_path = "dashboard/templates/dashboard/principal.html"
    
    find_missing_div_closes(file_path)
    find_structure_sections(file_path)
