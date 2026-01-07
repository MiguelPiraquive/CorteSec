"""
Comando para crear logs de auditoría de prueba
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import LogAuditoria
from datetime import timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Crea logs de auditoría de prueba para testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cantidad',
            type=int,
            default=50,
            help='Cantidad de logs a crear'
        )

    def handle(self, *args, **options):
        cantidad = options['cantidad']
        
        # Obtener usuarios
        usuarios = list(User.objects.all()[:5])
        if not usuarios:
            self.stdout.write(self.style.ERROR('No hay usuarios en el sistema'))
            return
        
        acciones = [
            'crear_prestamo',
            'modificar_prestamo',
            'eliminar_prestamo',
            'crear_empleado',
            'modificar_empleado',
            'login',
            'logout',
            'crear_rol',
            'asignar_permiso',
            'exportar_reporte',
            'crear_cargo',
            'modificar_cargo',
        ]
        
        modelos = [
            'Prestamo',
            'Empleado',
            'User',
            'Rol',
            'Permiso',
            'Cargo',
            'Item',
            'Contabilidad',
        ]
        
        ips = [
            '192.168.1.100',
            '192.168.1.101',
            '192.168.1.102',
            '10.0.0.50',
            '10.0.0.51',
        ]
        
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ]
        
        logs_creados = 0
        
        for i in range(cantidad):
            # Crear log con fecha aleatoria en los últimos 30 días
            dias_atras = random.randint(0, 30)
            horas_atras = random.randint(0, 23)
            fecha = timezone.now() - timedelta(days=dias_atras, hours=horas_atras)
            
            log = LogAuditoria.objects.create(
                usuario=random.choice(usuarios),
                accion=random.choice(acciones),
                modelo=random.choice(modelos),
                objeto_id=str(random.randint(1, 1000)),
                ip_address=random.choice(ips),
                user_agent=random.choice(user_agents),
                datos_antes={'ejemplo': 'datos antes'},
                datos_despues={'ejemplo': 'datos después'},
                metadata={'origen': 'testing', 'version': '1.0'}
            )
            # Actualizar manualmente el created_at
            log.created_at = fecha
            log.save(update_fields=['created_at'])
            
            logs_creados += 1
            
            if logs_creados % 10 == 0:
                self.stdout.write(f'Creados {logs_creados} logs...')
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Se crearon {logs_creados} logs de auditoría correctamente')
        )
