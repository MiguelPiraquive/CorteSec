import os
import sys
import django

# Configurar Django
sys.path.append(r'c:\Users\migue\Desktop\CorteSec\contractor_management')
os.chdir(r'c:\Users\migue\Desktop\CorteSec\contractor_management')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contractor_management.settings')

try:
    django.setup()
    
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    print("🔍 Estado básico de la base de datos:")
    print(f"📊 Usuarios: {User.objects.count()}")
    
    # Mostrar usuarios disponibles
    users = User.objects.all()[:5]
    if users:
        print("\n👤 Usuarios disponibles:")
        for user in users:
            print(f"   - {user.username} ({'activo' if user.is_active else 'inactivo'})")
    
    # Intentar importar modelos específicos
    try:
        from empleados.models import Empleado
        print(f"� Empleados: {Empleado.objects.count()}")
        if Empleado.objects.exists():
            print(f"   - Primer empleado: {Empleado.objects.first().nombre_completo}")
    except ImportError as e:
        print(f"⚠️ No se pudo importar Empleado: {e}")
    
    try:
        from payroll.models import Nomina
        print(f"💰 Nóminas: {Nomina.objects.count()}")
        if Nomina.objects.exists():
            ultima_nomina = Nomina.objects.order_by('-fecha_creacion').first()
            print(f"   - Última nómina: {ultima_nomina.fecha_creacion} - ${ultima_nomina.total_nomina}")
    except ImportError as e:
        print(f"⚠️ No se pudo importar Nomina: {e}")
    
    try:
        from prestamos.models import Prestamo
        print(f"🏦 Préstamos: {Prestamo.objects.count()}")
        if Prestamo.objects.exists():
            ultimo_prestamo = Prestamo.objects.order_by('-fecha_solicitud').first()
            print(f"   - Último préstamo: {ultimo_prestamo.fecha_solicitud} - ${ultimo_prestamo.monto}")
    except ImportError as e:
        print(f"⚠️ No se pudo importar Prestamo: {e}")
    
    print("\n✅ Verificación completada")
        
except Exception as e:
    print(f"💥 Error: {e}")
    import traceback
    traceback.print_exc()
