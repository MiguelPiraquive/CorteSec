#!/usr/bin/env python3
"""
Conteo final de divs para confirmar el balance
"""

def final_count():
    with open("dashboard/templates/dashboard/principal.html", 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Contar de forma simple
    open_divs = content.count('<div')
    close_divs = content.count('</div>')
    
    print(f"📊 CONTEO FINAL DE DIVS:")
    print(f"Aperturas <div: {open_divs}")
    print(f"Cierres </div>: {close_divs}")
    print(f"Balance: {open_divs - close_divs}")
    
    if open_divs == close_divs:
        print("✅ ESTRUCTURA HTML PERFECTAMENTE BALANCEADA")
        return True
    elif open_divs > close_divs:
        print(f"⚠️ FALTAN {open_divs - close_divs} cierres de div")
        return False
    else:
        print(f"⚠️ SOBRAN {close_divs - open_divs} cierres de div")
        return False

final_count()
