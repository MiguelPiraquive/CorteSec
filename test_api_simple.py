import os
import sys
import django

# Configurar Django
sys.path.append(r'c:\Users\migue\Desktop\CorteSec\contractor_management')
os.chdir(r'c:\Users\migue\Desktop\CorteSec\contractor_management')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')

try:
    django.setup()
    
    from django.test import RequestFactory
    from django.contrib.auth.models import User
    from dashboard.views import dashboard_api_graficos
    
    print("🔧 Configuración Django completada")
    
    # Crear un request simulado
    factory = RequestFactory()
    request = factory.get('/dashboard/api/graficos/')
    
    # Obtener un usuario para simular autenticación
    try:
        user = User.objects.first()
        request.user = user if user else None
        print(f"👤 Usuario: {user.username if user else 'None'}")
    except Exception as e:
        print(f"⚠️ Error obteniendo usuario: {e}")
        request.user = None
    
    # Probar la API
    print("📡 Probando API de gráficos...")
    
    response = dashboard_api_graficos(request)
    print(f"📊 Status: {response.status_code}")
    
    if response.status_code == 200:
        import json
        data = json.loads(response.content.decode())
        print("✅ Respuesta de API:")
        print(f"   Success: {data.get('success', 'N/A')}")
        if data.get('success'):
            print(f"   Nóminas: {len(data.get('nominas_evolucion', []))} registros")
            print(f"   Préstamos: {len(data.get('prestamos_distribucion', []))} registros")
            print(f"   Empleados: {len(data.get('empleados_crecimiento', []))} registros")
            print(f"   Productividad: {len(data.get('top_productividad', []))} registros")
        else:
            print(f"   Error: {data.get('error', 'No especificado')}")
    else:
        print(f"❌ Error en API: {response.status_code}")
        print(f"   Contenido: {response.content.decode()}")
        
except Exception as e:
    print(f"💥 Error general: {e}")
    import traceback
    traceback.print_exc()
