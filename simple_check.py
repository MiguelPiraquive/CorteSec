#!/usr/bin/env python3
"""
Análisis simple y directo de divs
"""

def simple_div_count():
    with open("dashboard/templates/dashboard/principal.html", 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Contar de forma simple
    open_divs = content.count('<div')
    close_divs = content.count('</div>')
    
    print(f"📊 CONTEO SIMPLE:")
    print(f"Aperturas <div: {open_divs}")
    print(f"Cierres </div>: {close_divs}")
    print(f"Balance: {open_divs - close_divs}")
    
    if open_divs == close_divs:
        print("✅ ESTRUCTURA BALANCEADA")
    elif open_divs > close_divs:
        print(f"⚠️ FALTAN {open_divs - close_divs} cierres de div")
    else:
        print(f"⚠️ SOBRAN {close_divs - open_divs} cierres de div")

def check_line_by_line():
    """Verifica línea por línea para encontrar el problema"""
    
    with open("dashboard/templates/dashboard/principal.html", 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"\n🔍 VERIFICACIÓN LÍNEA POR LÍNEA:")
    
    total_opens = 0
    total_closes = 0
    
    for line_num, line in enumerate(lines, 1):
        opens = line.count('<div')
        closes = line.count('</div>')
        
        total_opens += opens
        total_closes += closes
        
        if opens > 0 or closes > 0:
            balance = total_opens - total_closes
            print(f"Línea {line_num:4d}: +{opens} -{closes} | Balance total: {balance:+3d} | {line.strip()[:60]}...")

simple_div_count()
check_line_by_line()
