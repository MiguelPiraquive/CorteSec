"""
Comando para activar la asignación de rol de un usuario
"""

from django.core.management.base import BaseCommand
from roles.models import Rol, AsignacionRol
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Activa la asignación de rol para un usuario específico'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email del usuario')
        parser.add_argument('--rol', type=str, default='SUPER_ADMIN', help='Código del rol')

    def handle(self, *args, **options):
        email = options['email']
        rol_codigo = options['rol']
        
        self.stdout.write("\n" + "="*80)
        self.stdout.write("🔓 ACTIVAR ASIGNACIÓN DE ROL")
        self.stdout.write("="*80)
        
        try:
            # Buscar usuario
            usuario = User.objects.get(email=email)
            self.stdout.write(f"\n✅ Usuario encontrado:")
            self.stdout.write(f"   └─ Email: {usuario.email}")
            self.stdout.write(f"   └─ Nombre: {usuario.get_full_name()}")
            self.stdout.write(f"   └─ ID: {usuario.id}")
            
            # Buscar rol
            rol = Rol.objects.get(codigo=rol_codigo)
            self.stdout.write(f"\n✅ Rol encontrado:")
            self.stdout.write(f"   └─ Nombre: {rol.nombre}")
            self.stdout.write(f"   └─ Código: {rol.codigo}")
            self.stdout.write(f"   └─ Permisos: {rol.permisos.count()}")
            
            # Buscar asignación
            asignacion = AsignacionRol.objects.get(usuario=usuario, rol=rol)
            
            # Obtener estado ACTIVA
            from roles.models import EstadoAsignacion
            estado_activa = EstadoAsignacion.objects.get(nombre='ACTIVA')
            
            estado_anterior = asignacion.activa
            
            if estado_anterior and asignacion.estado.nombre == 'ACTIVA':
                self.stdout.write(self.style.WARNING("\n⚠️  La asignación ya está ACTIVA"))
            else:
                self.stdout.write(f"\n📌 Estado actual:")
                self.stdout.write(f"   └─ Campo 'activa': {asignacion.activa}")
                self.stdout.write(f"   └─ Estado FK: {asignacion.estado.nombre}")
                self.stdout.write(f"   └─ Fecha asignación: {asignacion.fecha_inicio}")
                
                # Activar AMBOS campos
                asignacion.activa = True
                asignacion.estado = estado_activa
                asignacion.save()
                
                self.stdout.write("\n" + "="*80)
                self.stdout.write(self.style.SUCCESS("✅ ASIGNACIÓN ACTIVADA EXITOSAMENTE"))
                self.stdout.write("="*80)
                self.stdout.write(f"\n👤 Usuario: {usuario.email}")
                self.stdout.write(f"👑 Rol: {rol.nombre}")
                self.stdout.write(f"🔓 Campo 'activa': True")
                self.stdout.write(f"🔓 Estado FK: ACTIVA")
                self.stdout.write(f"🎯 Permisos disponibles: {rol.permisos.count()}")
                
                # Mostrar permisos de Ferias
                permisos_ferias = rol.permisos.filter(modulo__codigo='FERIAS').count()
                if permisos_ferias > 0:
                    self.stdout.write(f"🎪 Permisos de Ferias: {permisos_ferias}")
                
                self.stdout.write("\n✅ El usuario ahora tiene acceso completo al sistema")
            
            self.stdout.write("\n" + "="*80 + "\n")
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"\n❌ Usuario con email '{email}' no encontrado"))
            self.stdout.write("="*80 + "\n")
        except Rol.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"\n❌ Rol con código '{rol_codigo}' no encontrado"))
            self.stdout.write("="*80 + "\n")
        except AsignacionRol.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"\n❌ No existe asignación del rol '{rol_codigo}' para el usuario '{email}'"))
            self.stdout.write("💡 Tip: Primero debes crear la asignación antes de activarla")
            self.stdout.write("="*80 + "\n")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Error: {e}"))
            self.stdout.write("="*80 + "\n")
