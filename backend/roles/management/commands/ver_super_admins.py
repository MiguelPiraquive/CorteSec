"""
Comando de management para listar usuarios con rol Super Administrador
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from roles.models import Rol, AsignacionRol
from permisos.models import PermisoDirecto, ModuloSistema

User = get_user_model()


class Command(BaseCommand):
    help = 'Lista todos los usuarios con rol Super Administrador'

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*80)
        self.stdout.write("👑 USUARIOS CON ROL SUPER ADMINISTRADOR")
        self.stdout.write("="*80)

        try:
            # Buscar el rol
            super_admin = Rol.objects.get(codigo='SUPER_ADMIN')
            self.stdout.write(f"\n✅ Rol: {super_admin.nombre}")
            self.stdout.write(f"   Código: {super_admin.codigo}")
            self.stdout.write(f"   Permisos totales: {super_admin.permisos.count()}")
            
            # Permisos de Ferias en el rol
            permisos_ferias_rol = super_admin.permisos.filter(modulo__codigo='FERIAS').count()
            self.stdout.write(f"   Permisos de Ferias: {permisos_ferias_rol}")
            
            # Buscar TODAS las asignaciones (activas e inactivas)
            asignaciones_activas = AsignacionRol.objects.filter(
                rol=super_admin,
                activa=True
            ).select_related('usuario')
            
            asignaciones_inactivas = AsignacionRol.objects.filter(
                rol=super_admin,
                activa=False
            ).select_related('usuario')
            
            asignaciones = list(asignaciones_activas) + list(asignaciones_inactivas)
            
            if asignaciones:
                self.stdout.write(f"\n📋 USUARIOS CON ESTE ROL (Total: {len(asignaciones)}):")
                self.stdout.write(f"   └─ Activos: {len(asignaciones_activas)}")
                self.stdout.write(f"   └─ Inactivos: {len(asignaciones_inactivas)}")
                self.stdout.write("-" * 80)
                
                for i, asignacion in enumerate(asignaciones, 1):
                    usuario = asignacion.usuario
                    estado_icon = "✅" if asignacion.activa else "⚠️"
                    self.stdout.write(f"\n{estado_icon} Usuario {i}:")
                    self.stdout.write(f"   📧 Email: {usuario.email}")
                    self.stdout.write(f"   👤 Nombre: {usuario.get_full_name()}")
                    self.stdout.write(f"   🆔 ID: {usuario.id}")
                    self.stdout.write(f"   ✔️  Activo: {'Sí' if usuario.is_active else 'No'}")
                    self.stdout.write(f"   🔧 Staff: {'Sí' if usuario.is_staff else 'No'}")
                    self.stdout.write(f"   ⭐ Superuser: {'Sí' if usuario.is_superuser else 'No'}")
                    self.stdout.write(f"   📅 Asignación: {asignacion.fecha_inicio.strftime('%Y-%m-%d %H:%M')}")
                    if hasattr(asignacion, 'estado'):
                        self.stdout.write(f"   🔒 Estado: {asignacion.estado}")
                    elif hasattr(asignacion, 'activa'):
                        self.stdout.write(f"   🔒 Estado: {'Activa' if asignacion.activa else '❌ INACTIVA'}")
                    
                    # Verificar permisos directos de Ferias
                    try:
                        modulo_ferias = ModuloSistema.objects.get(codigo='FERIAS')
                        permisos_directos = PermisoDirecto.objects.filter(
                            usuario=usuario,
                            permiso__modulo=modulo_ferias,
                            activa=True
                        ).count()
                        
                        if permisos_directos > 0:
                            self.stdout.write(f"   🎯 Permisos directos de Ferias: {permisos_directos}")
                    except:
                        pass
                
                self.stdout.write("\n" + "="*80)
                self.stdout.write("📊 RESUMEN:")
                self.stdout.write(f"   • Total usuarios: {len(asignaciones)}")
                self.stdout.write(f"   • Activos: {len(asignaciones_activas)}")
                self.stdout.write(f"   • Inactivos: {len(asignaciones_inactivas)}")
                self.stdout.write(f"   • Permisos del rol: {super_admin.permisos.count()}")
                self.stdout.write(f"   • Permisos de Ferias: {permisos_ferias_rol}")
                self.stdout.write("="*80 + "\n")
                
                self.stdout.write(self.style.SUCCESS('\n✅ Consulta completada exitosamente\n'))
            else:
                self.stdout.write(self.style.WARNING("\n⚠️  No hay usuarios asignados al rol Super Administrador"))
                self.stdout.write("="*80 + "\n")
                
        except Rol.DoesNotExist:
            self.stdout.write(self.style.ERROR("\n❌ ERROR: Rol 'SUPER_ADMIN' no existe"))
            self.stdout.write("="*80 + "\n")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ ERROR: {e}"))
            self.stdout.write("="*80 + "\n")
