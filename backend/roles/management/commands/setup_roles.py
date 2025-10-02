"""
Comando para inicializar el sistema de roles con datos por defecto
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from roles.models import TipoRol, Rol, EstadoAsignacion
from roles.utils import inicializar_estados_asignacion, crear_tipos_rol_default

User = get_user_model()


class Command(BaseCommand):
    help = 'Inicializa el sistema de roles con datos por defecto'

    def add_arguments(self, parser):
        parser.add_argument(
            '--crear-roles-basicos',
            action='store_true',
            help='Crear roles básicos del sistema'
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reiniciar datos (CUIDADO: elimina datos existentes)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Inicializando sistema de roles...'))
        
        with transaction.atomic():
            if options['reset']:
                self.stdout.write(self.style.WARNING('Eliminando datos existentes...'))
                self._reset_data()
            
            # Inicializar estados y tipos
            self._inicializar_estados()
            self._inicializar_tipos()
            
            if options['crear_roles_basicos']:
                self._crear_roles_basicos()
            
        self.stdout.write(self.style.SUCCESS('Sistema de roles inicializado correctamente'))

    def _reset_data(self):
        """Reinicia todos los datos (CUIDADO)"""
        from roles.models import AsignacionRol, Rol
        
        AsignacionRol.objects.all().delete()
        Rol.objects.all().delete()
        EstadoAsignacion.objects.all().delete()
        TipoRol.objects.all().delete()
        
        self.stdout.write('Datos eliminados')

    def _inicializar_estados(self):
        """Inicializa estados de asignación"""
        inicializar_estados_asignacion()
        self.stdout.write('Estados de asignación inicializados')

    def _inicializar_tipos(self):
        """Inicializa tipos de rol"""
        crear_tipos_rol_default()
        self.stdout.write('Tipos de rol inicializados')

    def _crear_roles_basicos(self):
        """Crea roles básicos del sistema"""
        
        # Obtener tipos
        tipo_sistema = TipoRol.objects.get(nombre='Sistema')
        tipo_admin = TipoRol.objects.get(nombre='Administrativo')
        tipo_operativo = TipoRol.objects.get(nombre='Operativo')
        tipo_consulta = TipoRol.objects.get(nombre='Consulta')
        
        # Crear roles básicos
        roles_basicos = [
            {
                'nombre': 'Superadministrador',
                'codigo': 'SUPERADMIN',
                'descripcion': 'Acceso completo a todo el sistema',
                'tipo_rol': tipo_sistema,
                'es_sistema': True,
                'nivel_jerarquico': 0,
                'prioridad': 100
            },
            {
                'nombre': 'Administrador',
                'codigo': 'ADMIN',
                'descripcion': 'Administrador general del sistema',
                'tipo_rol': tipo_admin,
                'nivel_jerarquico': 1,
                'prioridad': 90
            },
            {
                'nombre': 'Supervisor',
                'codigo': 'SUPERVISOR',
                'descripcion': 'Supervisor de operaciones',
                'tipo_rol': tipo_operativo,
                'nivel_jerarquico': 2,
                'prioridad': 70
            },
            {
                'nombre': 'Operador',
                'codigo': 'OPERADOR',
                'descripcion': 'Operador estándar',
                'tipo_rol': tipo_operativo,
                'nivel_jerarquico': 3,
                'prioridad': 50
            },
            {
                'nombre': 'Usuario',
                'codigo': 'USER',
                'descripcion': 'Usuario básico del sistema',
                'tipo_rol': tipo_consulta,
                'nivel_jerarquico': 4,
                'prioridad': 30
            },
            {
                'nombre': 'Consultor',
                'codigo': 'CONSULTOR',
                'descripcion': 'Solo lectura y consultas',
                'tipo_rol': tipo_consulta,
                'nivel_jerarquico': 4,
                'prioridad': 20
            }
        ]
        
        # Crear roles con jerarquía
        roles_creados = {}
        
        for rol_data in roles_basicos:
            rol, created = Rol.objects.get_or_create(
                codigo=rol_data['codigo'],
                defaults=rol_data
            )
            
            if created:
                self.stdout.write(f'Rol creado: {rol.nombre}')
            
            roles_creados[rol_data['codigo']] = rol
        
        # Establecer jerarquía
        try:
            # Administrador hereda de Superadministrador
            admin = roles_creados['ADMIN']
            admin.rol_padre = roles_creados['SUPERADMIN']
            admin.save()
            
            # Supervisor hereda de Administrador
            supervisor = roles_creados['SUPERVISOR']
            supervisor.rol_padre = admin
            supervisor.save()
            
            # Operador hereda de Supervisor
            operador = roles_creados['OPERADOR']
            operador.rol_padre = supervisor
            operador.save()
            
            # Usuario hereda de Operador
            usuario = roles_creados['USER']
            usuario.rol_padre = operador
            usuario.save()
            
            self.stdout.write('Jerarquía de roles establecida')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error estableciendo jerarquía: {e}')
            )
        
        self.stdout.write(f'Roles básicos creados: {len(roles_basicos)}')
