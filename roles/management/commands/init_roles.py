from django.core.management.base import BaseCommand
from roles.models import Rol
from permisos.models import Permiso, RolPermiso


class Command(BaseCommand):
    help = 'Crea roles básicos del sistema'

    def handle(self, *args, **options):
        # Crear roles básicos
        roles = [
            {
                'nombre': 'Administrador',
                'descripcion': 'Acceso completo al sistema',
                'es_sistema': True,
                'tiene_restriccion_horario': False,
            },
            {
                'nombre': 'Gerente',
                'descripcion': 'Acceso gerencial con restricciones',
                'es_sistema': True,
                'tiene_restriccion_horario': True,
                'hora_inicio': '07:00',
                'hora_fin': '19:00',
                'dias_semana': '123456',  # Lunes a sábado
            },
            {
                'nombre': 'Supervisor',
                'descripcion': 'Supervisión de operaciones diarias',
                'es_sistema': True,
                'tiene_restriccion_horario': True,
                'hora_inicio': '08:00',
                'hora_fin': '18:00',
                'dias_semana': '12345',  # Lunes a viernes
            },
            {
                'nombre': 'Empleado',
                'descripcion': 'Acceso básico para empleados',
                'es_sistema': True,
                'tiene_restriccion_horario': True,
                'hora_inicio': '08:00',
                'hora_fin': '17:00',
                'dias_semana': '12345',  # Lunes a viernes
            },
            {
                'nombre': 'Contador',
                'descripcion': 'Acceso al módulo contable',
                'es_sistema': True,
                'tiene_restriccion_horario': True,
                'hora_inicio': '08:00',
                'hora_fin': '18:00',
                'dias_semana': '12345',  # Lunes a viernes
            },
        ]

        roles_creados = {}
        for rol_data in roles:
            rol, created = Rol.objects.get_or_create(
                nombre=rol_data['nombre'],
                defaults=rol_data
            )
            roles_creados[rol.nombre] = rol
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Creado rol: {rol.nombre}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Ya existe rol: {rol.nombre}')
                )

        # Asignar permisos a roles
        self.asignar_permisos_administrador(roles_creados.get('Administrador'))
        self.asignar_permisos_gerente(roles_creados.get('Gerente'))
        self.asignar_permisos_supervisor(roles_creados.get('Supervisor'))
        self.asignar_permisos_empleado(roles_creados.get('Empleado'))
        self.asignar_permisos_contador(roles_creados.get('Contador'))

        self.stdout.write(
            self.style.SUCCESS('Roles básicos inicializados correctamente')
        )

    def asignar_permisos_administrador(self, rol):
        """Asigna todos los permisos al administrador"""
        if rol:
            permisos = Permiso.objects.all()
            for permiso in permisos:
                RolPermiso.objects.get_or_create(
                    rol=rol,
                    permiso=permiso,
                    defaults={'activo': True}
                )
            self.stdout.write(f'Permisos asignados a {rol.nombre}: {permisos.count()}')

    def asignar_permisos_gerente(self, rol):
        """Asigna permisos de gerente"""
        if rol:
            # Todos los permisos excepto configuración crítica
            modulos_permitidos = ['dashboard', 'payroll', 'prestamos', 'cargos', 'contabilidad', 'ayuda', 'documentacion']
            permisos = Permiso.objects.filter(modulo__codigo__in=modulos_permitidos)
            
            for permiso in permisos:
                RolPermiso.objects.get_or_create(
                    rol=rol,
                    permiso=permiso,
                    defaults={'activo': True}
                )
            self.stdout.write(f'Permisos asignados a {rol.nombre}: {permisos.count()}')

    def asignar_permisos_supervisor(self, rol):
        """Asigna permisos de supervisor"""
        if rol:
            # Permisos de visualización y edición limitada
            modulos_permitidos = ['dashboard', 'payroll', 'prestamos', 'ayuda']
            tipos_permitidos = ['view', 'change']
            permisos = Permiso.objects.filter(
                modulo__codigo__in=modulos_permitidos,
                tipo_permiso__codigo__in=tipos_permitidos
            )
            
            for permiso in permisos:
                RolPermiso.objects.get_or_create(
                    rol=rol,
                    permiso=permiso,
                    defaults={'activo': True}
                )
            self.stdout.write(f'Permisos asignados a {rol.nombre}: {permisos.count()}')

    def asignar_permisos_empleado(self, rol):
        """Asigna permisos básicos de empleado"""
        if rol:
            # Solo visualización de dashboard, su información y ayuda
            modulos_permitidos = ['dashboard', 'ayuda', 'documentacion']
            permisos = Permiso.objects.filter(
                modulo__codigo__in=modulos_permitidos,
                tipo_permiso__codigo='view'
            )
            
            for permiso in permisos:
                RolPermiso.objects.get_or_create(
                    rol=rol,
                    permiso=permiso,
                    defaults={'activo': True}
                )
            self.stdout.write(f'Permisos asignados a {rol.nombre}: {permisos.count()}')

    def asignar_permisos_contador(self, rol):
        """Asigna permisos de contador"""
        if rol:
            # Acceso completo a contabilidad y visualización de otros módulos
            permisos_contabilidad = Permiso.objects.filter(modulo__codigo='contabilidad')
            permisos_view = Permiso.objects.filter(
                modulo__codigo__in=['dashboard', 'payroll', 'prestamos'],
                tipo_permiso__codigo='view'
            )
            
            for permiso in permisos_contabilidad:
                RolPermiso.objects.get_or_create(
                    rol=rol,
                    permiso=permiso,
                    defaults={'activo': True}
                )
            
            for permiso in permisos_view:
                RolPermiso.objects.get_or_create(
                    rol=rol,
                    permiso=permiso,
                    defaults={'activo': True}
                )
            
            total_permisos = permisos_contabilidad.count() + permisos_view.count()
            self.stdout.write(f'Permisos asignados a {rol.nombre}: {total_permisos}')
