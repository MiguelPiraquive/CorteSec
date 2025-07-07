#!/usr/bin/env python3
"""
Script para identificar y corregir problemas específicos de estructura HTML
"""
import re

def find_problematic_divs(file_path):
    """Encuentra los divs problemáticos específicos"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print("🔍 Analizando divs problemáticos específicos...")
    print("=" * 60)
    
    # Contar aperturas y cierres de div línea por línea
    div_balance = 0
    problematic_lines = []
    
    for i, line in enumerate(lines, 1):
        line_stripped = line.strip()
        
        # Contar divs de apertura
        opens = len(re.findall(r'<div(?:\s[^>]*)?>', line))
        # Contar divs de cierre
        closes = len(re.findall(r'</div>', line))
        
        div_balance += opens - closes
        
        # Si el balance se vuelve negativo, hay un cierre sin apertura
        if div_balance < 0:
            problematic_lines.append({
                'line': i,
                'content': line_stripped,
                'balance': div_balance,
                'opens': opens,
                'closes': closes,
                'issue': 'Cierre sin apertura correspondiente'
            })
        
        # Si hay múltiples cierres en una línea, puede ser problemático
        if closes > 1:
            problematic_lines.append({
                'line': i,
                'content': line_stripped,
                'balance': div_balance,
                'opens': opens,
                'closes': closes,
                'issue': f'Múltiples cierres ({closes}) en una línea'
            })
    
    # Balance final
    print(f"📊 Balance final de divs: {div_balance}")
    if div_balance != 0:
        if div_balance > 0:
            print(f"❌ Hay {div_balance} divs sin cerrar")
        else:
            print(f"❌ Hay {abs(div_balance)} cierres de div de más")
    
    print(f"\n🔍 Líneas problemáticas encontradas ({len(problematic_lines)}):")
    print("-" * 60)
    
    for problem in problematic_lines:
        print(f"Línea {problem['line']:4d}: {problem['issue']}")
        print(f"           Balance: {problem['balance']:2d} | Abre: {problem['opens']} | Cierra: {problem['closes']}")
        print(f"           Contenido: {problem['content'][:80]}...")
        print()
    
    # Buscar patrones específicos problemáticos
    print("\n🔍 Buscando patrones problemáticos específicos...")
    print("-" * 60)
    
    content = ''.join(lines)
    
    # Buscar </div> sin <div correspondiente cerca
    div_closes = re.finditer(r'</div>', content)
    for match in div_closes:
        start_pos = max(0, match.start() - 200)
        end_pos = min(len(content), match.end() + 200)
        context = content[start_pos:end_pos]
        
        # Contar divs en el contexto
        opens_in_context = len(re.findall(r'<div(?:\s[^>]*)?>', context))
        closes_in_context = len(re.findall(r'</div>', context))
        
        if closes_in_context > opens_in_context:
            line_num = content[:match.start()].count('\n') + 1
            print(f"⚠️  Línea {line_num}: Posible </div> sin apertura en contexto local")
    
    return problematic_lines

def main():
    file_path = 'dashboard/templates/dashboard/principal.html'
    problematic_lines = find_problematic_divs(file_path)
    
    print("\n" + "=" * 60)
    print("🎯 RECOMENDACIONES DE CORRECCIÓN:")
    print("-" * 60)
    
    if problematic_lines:
        print("1. Revisar las líneas marcadas arriba")
        print("2. Buscar divs de apertura faltantes antes de los cierres problemáticos")
        print("3. Verificar que no haya divs duplicados o mal anidados")
        print("4. Usar un editor con resaltado de HTML para balance de tags")
    else:
        print("✅ No se encontraron patrones problemáticos evidentes")
    
    print("\n📝 Para corregir:")
    print("- Línea 569: Buscar div de apertura faltante")
    print("- Línea 2019: Buscar div de apertura faltante") 
    print("- Balance general: Añadir 2 divs de apertura o quitar 2 de cierre")

if __name__ == "__main__":
    main()
