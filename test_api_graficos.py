#!/usr/bin/env python
"""
Script para probar la API de gráficos
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')
django.setup()

from dashboard.views import dashboard_api_graficos
from django.http import HttpRequest
from django.test import RequestFactory
import json

def test_api_graficos():
    """Probar la API de gráficos"""
    try:
        # Crear una request falsa
        factory = RequestFactory()
        request = factory.get('/dashboard/api/graficos/')
        
        # Llamar a la vista
        response = dashboard_api_graficos(request)
        
        print("✅ Status Code:", response.status_code)
        
        if response.status_code == 200:
            data = json.loads(response.content)
            print("✅ Respuesta exitosa!")
            print("📊 Datos disponibles:")
            
            if data.get('success'):
                print(f"   - Nóminas evolución: {len(data.get('nominas_evolucion', []))} registros")
                print(f"   - Préstamos distribución: {len(data.get('prestamos_distribucion', []))} registros")
                print(f"   - Empleados crecimiento: {len(data.get('empleados_crecimiento', []))} registros")
                print(f"   - Top productividad: {len(data.get('top_productividad', []))} registros")
                
                # Mostrar datos de ejemplo
                if data.get('nominas_evolucion'):
                    print("\n📈 Ejemplo nóminas evolución:")
                    for i, item in enumerate(data['nominas_evolucion'][:3]):
                        print(f"   {i+1}. {item.get('mes', 'N/A')}: ${item.get('total', 0):,.2f}")
                
                if data.get('prestamos_distribucion'):
                    print("\n💳 Ejemplo préstamos distribución:")
                    for i, item in enumerate(data['prestamos_distribucion'][:3]):
                        print(f"   {i+1}. {item.get('estado', 'N/A')}: {item.get('count', 0)} préstamos")
                
                if data.get('empleados_crecimiento'):
                    print("\n👥 Ejemplo empleados crecimiento:")
                    for i, item in enumerate(data['empleados_crecimiento'][:3]):
                        print(f"   {i+1}. {item.get('mes', 'N/A')}: {item.get('total_acumulado', 0)} empleados")
                
                if data.get('top_productividad'):
                    print("\n🏆 Ejemplo top productividad:")
                    for i, item in enumerate(data['top_productividad'][:3]):
                        print(f"   {i+1}. {item.get('empleado', 'N/A')}: ${item.get('produccion_promedio', 0):,.2f}")
            else:
                print("❌ Error en la respuesta:", data.get('error', 'Error desconocido'))
        else:
            print("❌ Error HTTP:", response.status_code)
            
    except Exception as e:
        print("❌ Error ejecutando test:", str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Probando API de gráficos...")
    test_api_graficos()
