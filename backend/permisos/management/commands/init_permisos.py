"""
Comando para inicializar módulos y permisos básicos del sistema
==============================================================

Comando de Django para crear la estructura básica de módulos, 
tipos de permiso y permisos fundamentales del sistema.

Autor: Sistema CorteSec
Versión: 2.0.0
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone

from permisos.models import ModuloSistema, TipoPermiso, Permiso, CondicionPermiso
from core.models import Organizacion

User = get_user_model()


class Command(BaseCommand):
    help = 'Inicializa módulos y permisos básicos del sistema'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Elimina todos los datos existentes antes de crear los nuevos',
        )
        parser.add_argument(
            '--org',
            type=str,
            help='Nombre de la organización por defecto',
            default='CorteSec'
        )

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                if options['reset']:
                    self._reset_data()
                
                self._create_tipos_permiso()
                self._create_condiciones_basicas()
                self._create_modulos()
                self._create_permisos_basicos()
                
                self.stdout.write(
                    self.style.SUCCESS('✅ Inicialización completada exitosamente')
                )
        except Exception as e:
            raise CommandError(f'Error durante la inicialización: {e}')
    
    def _reset_data(self):
        """Elimina datos existentes."""
        self.stdout.write('🗑️  Eliminando datos existentes...')
        
        # Eliminar en orden correcto para evitar problemas de FK
        Permiso.objects.filter(es_sistema=True).delete()
        ModuloSistema.objects.filter(es_sistema=True).delete()
        TipoPermiso.objects.all().delete()
        CondicionPermiso.objects.all().delete()
        
        self.stdout.write(self.style.WARNING('Datos existentes eliminados'))
    
    def _create_tipos_permiso(self):
        """Crea los tipos de permiso básicos."""
        self.stdout.write('📋 Creando tipos de permiso...')
        
        tipos_permiso = [
            {
                'codigo': 'view',
                'nombre': 'Ver',
                'descripcion': 'Permite visualizar información',
                'categoria': 'crud',
                'icono': 'fas fa-eye',
                'color': '#10b981',
                'es_critico': False,
                'requiere_auditoria': False
            },
            {
                'codigo': 'add',
                'nombre': 'Crear',
                'descripcion': 'Permite crear nuevos registros',
                'categoria': 'crud',
                'icono': 'fas fa-plus',
                'color': '#3b82f6',
                'es_critico': False,
                'requiere_auditoria': True
            },
            {
                'codigo': 'change',
                'nombre': 'Editar',
                'descripcion': 'Permite modificar registros existentes',
                'categoria': 'crud',
                'icono': 'fas fa-edit',
                'color': '#f59e0b',
                'es_critico': False,
                'requiere_auditoria': True
            },
            {
                'codigo': 'delete',
                'nombre': 'Eliminar',
                'descripcion': 'Permite eliminar registros',
                'categoria': 'crud',
                'icono': 'fas fa-trash',
                'color': '#ef4444',
                'es_critico': True,
                'requiere_auditoria': True
            },
            {
                'codigo': 'export',
                'nombre': 'Exportar',
                'descripcion': 'Permite exportar datos',
                'categoria': 'report',
                'icono': 'fas fa-download',
                'color': '#8b5cf6',
                'es_critico': False,
                'requiere_auditoria': True
            },
            {
                'codigo': 'import',
                'nombre': 'Importar',
                'descripcion': 'Permite importar datos masivamente',
                'categoria': 'admin',
                'icono': 'fas fa-upload',
                'color': '#ec4899',
                'es_critico': True,
                'requiere_auditoria': True
            },
            {
                'codigo': 'approve',
                'nombre': 'Aprobar',
                'descripcion': 'Permite aprobar procesos y documentos',
                'categoria': 'workflow',
                'icono': 'fas fa-check',
                'color': '#10b981',
                'es_critico': True,
                'requiere_auditoria': True
            },
            {
                'codigo': 'reject',
                'nombre': 'Rechazar',
                'descripcion': 'Permite rechazar procesos y documentos',
                'categoria': 'workflow',
                'icono': 'fas fa-times',
                'color': '#ef4444',
                'es_critico': True,
                'requiere_auditoria': True
            },
            {
                'codigo': 'admin',
                'nombre': 'Administrar',
                'descripcion': 'Acceso completo de administración',
                'categoria': 'admin',
                'icono': 'fas fa-cog',
                'color': '#6b7280',
                'es_critico': True,
                'requiere_auditoria': True
            }
        ]

        for tipo_data in tipos_permiso:
            tipo, created = TipoPermiso.objects.get_or_create(
                codigo=tipo_data['codigo'],
                defaults=tipo_data
            )
            if created:
                self.stdout.write(f'  ✅ Creado tipo de permiso: {tipo.codigo} - {tipo.nombre}')
            else:
                self.stdout.write(f'  ⚠️  Tipo de permiso ya existe: {tipo.codigo}')
    
    def _create_condiciones_basicas(self):
        """Crea condiciones básicas del sistema."""
        self.stdout.write('🔧 Creando condiciones básicas...')
        
        condiciones = [
            {
                'codigo': 'horario_laboral',
                'nombre': 'Horario Laboral',
                'descripcion': 'Permite acceso solo en horario laboral',
                'tipo': 'time',
                'configuracion': {
                    'hora_inicio': '08:00',
                    'hora_fin': '18:00',
                    'dias_semana': [1, 2, 3, 4, 5]  # Lunes a Viernes
                },
                'cacheable': True,
                'tiempo_cache': 3600
            },
            {
                'codigo': 'ip_corporativa',
                'nombre': 'IP Corporativa',
                'descripcion': 'Permite acceso solo desde IPs corporativas',
                'tipo': 'location',
                'configuracion': {
                    'ips_permitidas': ['192.168.1.0/24', '10.0.0.0/8']
                },
                'cacheable': True,
                'tiempo_cache': 1800
            },
            {
                'codigo': 'usuario_activo',
                'nombre': 'Usuario Activo',
                'descripcion': 'Verifica que el usuario esté activo',
                'tipo': 'python',
                'codigo_evaluacion': 'return usuario.is_active',
                'cacheable': True,
                'tiempo_cache': 300
            }
        ]
        
        for cond_data in condiciones:
            condicion, created = CondicionPermiso.objects.get_or_create(
                codigo=cond_data['codigo'],
                defaults=cond_data
            )
            if created:
                self.stdout.write(f'  ✅ Creada condición: {condicion.codigo}')
            else:
                self.stdout.write(f'  ⚠️  Condición ya existe: {condicion.codigo}')
    
    def _create_modulos(self):
        """Crea los módulos básicos del sistema."""
        self.stdout.write('📁 Creando módulos del sistema...')
        
        modulos = [
            {
                'nombre': 'Dashboard',
                'codigo': 'dashboard',
                'descripcion': 'Panel principal del sistema',
                'icono': 'fas fa-tachometer-alt',
                'color': '#3b82f6',
                'url_base': '/dashboard/',
                'orden': 1,
                'es_sistema': True,
                'padre': None
            },
            {
                'nombre': 'Administración',
                'codigo': 'admin',
                'descripcion': 'Módulo de administración del sistema',
                'icono': 'fas fa-cogs',
                'color': '#6b7280',
                'url_base': '/admin/',
                'orden': 2,
                'es_sistema': True,
                'padre': None
            },
            {
                'nombre': 'Usuarios',
                'codigo': 'usuarios',
                'descripcion': 'Gestión de usuarios del sistema',
                'icono': 'fas fa-users',
                'color': '#10b981',
                'url_base': '/usuarios/',
                'orden': 3,
                'es_sistema': True,
                'padre': None
            },
            {
                'nombre': 'Permisos',
                'codigo': 'permisos',
                'descripcion': 'Sistema de gestión de permisos',
                'icono': 'fas fa-shield-alt',
                'color': '#8b5cf6',
                'url_base': '/permisos/',
                'orden': 4,
                'es_sistema': True,
                'padre': None
            },
            {
                'nombre': 'Nómina',
                'codigo': 'payroll',
                'descripcion': 'Gestión de nómina y empleados',
                'icono': 'fas fa-money-bill-wave',
                'color': '#f59e0b',
                'url_base': '/payroll/',
                'orden': 5,
                'es_sistema': True,
                'padre': None
            },
            {
                'nombre': 'Reportes',
                'codigo': 'reportes',
                'descripcion': 'Sistema de reportes y análisis',
                'icono': 'fas fa-chart-bar',
                'color': '#ec4899',
                'url_base': '/reportes/',
                'orden': 6,
                'es_sistema': True,
                'padre': None
            },
            {
                'nombre': 'Configuración',
                'codigo': 'configuracion',
                'descripcion': 'Configuración general del sistema',
                'icono': 'fas fa-cog',
                'color': '#6b7280',
                'url_base': '/configuracion/',
                'orden': 7,
                'es_sistema': True,
                'padre': None
            }
        ]

        # Crear módulos principales
        modulos_creados = {}
        for modulo_data in modulos:
            modulo, created = ModuloSistema.objects.get_or_create(
                codigo=modulo_data['codigo'],
                defaults=modulo_data
            )
            modulos_creados[modulo.codigo] = modulo
            if created:
                self.stdout.write(f'  ✅ Creado módulo: {modulo.codigo} - {modulo.nombre}')
            else:
                self.stdout.write(f'  ⚠️  Módulo ya existe: {modulo.codigo}')
        
        # Crear submódulos de administración
        submodulos_admin = [
            {
                'nombre': 'Gestión de Usuarios',
                'codigo': 'admin_usuarios',
                'descripcion': 'Administración avanzada de usuarios',
                'icono': 'fas fa-user-cog',
                'color': '#10b981',
                'url_base': '/admin/usuarios/',
                'orden': 1,
                'es_sistema': True,
                'padre': modulos_creados['admin']
            },
            {
                'nombre': 'Gestión de Permisos',
                'codigo': 'admin_permisos',
                'descripcion': 'Administración del sistema de permisos',
                'icono': 'fas fa-key',
                'color': '#8b5cf6',
                'url_base': '/admin/permisos/',
                'orden': 2,
                'es_sistema': True,
                'padre': modulos_creados['admin']
            },
            {
                'nombre': 'Auditoría',
                'codigo': 'admin_auditoria',
                'descripcion': 'Auditoría y logs del sistema',
                'icono': 'fas fa-clipboard-list',
                'color': '#ef4444',
                'url_base': '/admin/auditoria/',
                'orden': 3,
                'es_sistema': True,
                'padre': modulos_creados['admin']
            }
        ]
        
        for submodulo_data in submodulos_admin:
            submodulo, created = ModuloSistema.objects.get_or_create(
                codigo=submodulo_data['codigo'],
                defaults=submodulo_data
            )
            if created:
                self.stdout.write(f'    ✅ Creado submódulo: {submodulo.codigo}')
    
    def _create_permisos_basicos(self):
        """Crea los permisos básicos del sistema."""
        self.stdout.write('🔐 Creando permisos básicos...')
        
        # Obtener tipos y módulos
        tipos = {t.codigo: t for t in TipoPermiso.objects.all()}
        modulos = {m.codigo: m for m in ModuloSistema.objects.all()}
        
        permisos_por_modulo = [
            # Dashboard
            ('dashboard', 'view', 'Ver Dashboard', 'Permite acceder al panel principal'),
            
            # Usuarios
            ('usuarios', 'view', 'Ver Usuarios', 'Permite ver la lista de usuarios'),
            ('usuarios', 'add', 'Crear Usuarios', 'Permite crear nuevos usuarios'),
            ('usuarios', 'change', 'Editar Usuarios', 'Permite modificar usuarios existentes'),
            ('usuarios', 'delete', 'Eliminar Usuarios', 'Permite eliminar usuarios'),
            
            # Permisos
            ('permisos', 'view', 'Ver Permisos', 'Permite ver el sistema de permisos'),
            ('permisos', 'add', 'Crear Permisos', 'Permite crear nuevos permisos'),
            ('permisos', 'change', 'Editar Permisos', 'Permite modificar permisos'),
            ('permisos', 'delete', 'Eliminar Permisos', 'Permite eliminar permisos'),
            ('permisos', 'admin', 'Administrar Permisos', 'Acceso completo al sistema de permisos'),
            
            # Nómina
            ('payroll', 'view', 'Ver Nómina', 'Permite ver información de nómina'),
            ('payroll', 'add', 'Crear Nómina', 'Permite crear registros de nómina'),
            ('payroll', 'change', 'Editar Nómina', 'Permite modificar nómina'),
            ('payroll', 'approve', 'Aprobar Nómina', 'Permite aprobar procesos de nómina'),
            ('payroll', 'export', 'Exportar Nómina', 'Permite exportar datos de nómina'),
            
            # Reportes
            ('reportes', 'view', 'Ver Reportes', 'Permite acceder a reportes'),
            ('reportes', 'export', 'Exportar Reportes', 'Permite exportar reportes'),
            
            # Configuración
            ('configuracion', 'view', 'Ver Configuración', 'Permite ver configuración del sistema'),
            ('configuracion', 'change', 'Cambiar Configuración', 'Permite modificar configuración'),
            
            # Administración
            ('admin', 'admin', 'Super Administrador', 'Acceso completo de administración'),
            ('admin_usuarios', 'admin', 'Administrar Usuarios', 'Administración completa de usuarios'),
            ('admin_permisos', 'admin', 'Administrar Permisos', 'Administración completa de permisos'),
            ('admin_auditoria', 'view', 'Ver Auditoría', 'Permite acceder a logs de auditoría'),
        ]
        
        for modulo_codigo, tipo_codigo, nombre, descripcion in permisos_por_modulo:
            if modulo_codigo in modulos and tipo_codigo in tipos:
                codigo_permiso = f"{modulo_codigo}_{tipo_codigo}"
                
                permiso, created = Permiso.objects.get_or_create(
                    codigo=codigo_permiso,
                    defaults={
                        'nombre': nombre,
                        'descripcion': descripcion,
                        'modulo': modulos[modulo_codigo],
                        'tipo_permiso': tipos[tipo_codigo],
                        'ambito': 'modulo',
                        'es_sistema': True,
                        'activo': True
                    }
                )
                
                if created:
                    self.stdout.write(f'  ✅ Creado permiso: {permiso.codigo}')
                else:
                    self.stdout.write(f'  ⚠️  Permiso ya existe: {permiso.codigo}')
        
        # Crear permisos especiales
        self._create_permisos_especiales(tipos, modulos)
    
    def _create_permisos_especiales(self, tipos, modulos):
        """Crea permisos especiales del sistema."""
        self.stdout.write('⭐ Creando permisos especiales...')
        
        permisos_especiales = [
            {
                'codigo': 'system_full_access',
                'nombre': 'Acceso Completo al Sistema',
                'descripcion': 'Acceso sin restricciones a todo el sistema',
                'modulo': modulos['admin'],
                'tipo_permiso': tipos['admin'],
                'ambito': 'global',
                'es_sistema': True,
                'es_heredable': True,
                'prioridad': 100
            },
            {
                'codigo': 'emergency_access',
                'nombre': 'Acceso de Emergencia',
                'descripcion': 'Acceso de emergencia al sistema',
                'modulo': modulos['admin'],
                'tipo_permiso': tipos['admin'],
                'ambito': 'global',
                'es_sistema': True,
                'prioridad': 99
            },
            {
                'codigo': 'audit_view_all',
                'nombre': 'Ver Toda la Auditoría',
                'descripcion': 'Permite ver todos los registros de auditoría',
                'modulo': modulos['admin_auditoria'],
                'tipo_permiso': tipos['view'],
                'ambito': 'global',
                'es_sistema': True
            }
        ]
        
        for permiso_data in permisos_especiales:
            permiso, created = Permiso.objects.get_or_create(
                codigo=permiso_data['codigo'],
                defaults=permiso_data
            )
            
            if created:
                self.stdout.write(f'  ⭐ Creado permiso especial: {permiso.codigo}')
            else:
                self.stdout.write(f'  ⚠️  Permiso especial ya existe: {permiso.codigo}')
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Sistema inicializado con {Permiso.objects.count()} permisos')
        )
